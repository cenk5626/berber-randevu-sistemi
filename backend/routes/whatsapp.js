const express = require('express')
const router = express.Router()
const { sendWhatsAppMessage, isWhatsAppReady, getQRImage, getCurrentQR } = require('../whatsapp/whatsapp-service')

router.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Telefon ve mesaj zorunludur' })
    }

    if (!isWhatsAppReady()) {
      return res.status(503).json({ success: false, message: 'WhatsApp hazir degil. QR kodu tarayin.' })
    }

    const result = await sendWhatsAppMessage(phone, message)

    if (result.success) {
      res.json({ success: true, message: 'WhatsApp mesaji gonderildi' })
    } else {
      res.status(500).json({ success: false, message: result.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatasi', error: error.message })
  }
})

router.get('/status', (req, res) => {
  res.json({ ready: isWhatsAppReady() })
})

router.get('/qr', (req, res) => {
  const qrImage = getQRImage()
  if (!qrImage) {
    return res.status(404).json({ success: false, message: 'QR kod mevcut degil. WhatsApp zaten bagli veya henuz olusturulmadi.' })
  }
  const base64Data = qrImage.replace(/^data:image\/png;base64,/, '')
  res.type('png')
  res.send(Buffer.from(base64Data, 'base64'))
})

router.get('/qr-page', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp QR Kod</title>
      <style>
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #111; font-family: Arial; }
        .container { text-align: center; color: white; }
        img { max-width: 300px; border-radius: 10px; }
        h1 { margin-bottom: 20px; }
        p { color: #888; }
        .refresh { margin-top: 20px; padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>WhatsApp QR Kod</h1>
        <p>Telefonunuzdan WhatsApp > Bagli Cihazlar > Cihaz Bagla ile tarayin</p>
        <img id="qr" src="/api/whatsapp/qr" alt="QR Kod">
        <br>
        <button class="refresh" onclick="location.reload()">Yenile</button>
        <p id="status" style="margin-top: 20px;"></p>
      </div>
      <script>
        setInterval(async () => {
          const res = await fetch('/api/whatsapp/status');
          const data = await res.json();
          if (data.ready) {
            document.getElementById('status').textContent = 'Baglanti basarili! Bu sayfayi kapatabilirsiniz.';
            document.getElementById('status').style.color = '#25D366';
          }
        }, 3000);
      </script>
    </body>
    </html>
  `)
})

router.get('/test', async (req, res) => {
  try {
    const { sendWhatsAppMessage, isWhatsAppReady } = require('../whatsapp/whatsapp-service')
    
    if (!isWhatsAppReady()) {
      return res.json({ success: false, message: 'WhatsApp hazir degil' })
    }
    
    console.log('WhatsApp test basliyor...')
    const result = await sendWhatsAppMessage('+905352006262', 'Test mesaji - sistem calisiyor')
    console.log('WhatsApp test sonucu:', result)
    
    res.json(result)
  } catch (error) {
    console.error('WhatsApp test hatasi:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
