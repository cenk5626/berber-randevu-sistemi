const express = require('express')
const router = express.Router()
const { sendWhatsAppMessage, isWhatsAppReady, getQRImage, getCurrentQR, forceReconnect } = require('../whatsapp/whatsapp-service')

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
  const ready = isWhatsAppReady()
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp QR Kod</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #111; font-family: Arial; }
        .container { text-align: center; color: white; max-width: 400px; padding: 20px; }
        img { max-width: 300px; border-radius: 10px; background: white; padding: 10px; }
        h1 { margin-bottom: 10px; }
        p { color: #888; margin: 10px 0; }
        .status { padding: 10px; border-radius: 5px; margin: 15px 0; }
        .connected { background: #065F46; color: #6EE7B7; }
        .waiting { background: #1C3A1C; color: #86EFAC; }
        .error { background: #7F1D1D; color: #FCA5A5; }
        .btn { padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
        .btn-primary { background: #25D366; color: white; }
        .btn-danger { background: #DC2626; color: white; }
        .btn:hover { opacity: 0.9; }
        .hidden { display: none; }
        .loader { border: 3px solid #333; border-top: 3px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Whatsapp Baglantisi</h1>
        <div id="statusDiv" class="status ${ready ? 'connected' : 'waiting'}">
          ${ready ? 'Whatsapp bagli ve hazir' : 'QR kod bekleniyor...'}
        </div>
        <div id="qrContainer" class="${ready ? 'hidden' : ''}">
          <p>Telefonunuzdan Whatsapp > Bagli Cihazlar > Cihaz Bagla</p>
          <img id="qrImage" src="/api/whatsapp/qr" alt="QR Kod" onerror="this.parentElement.innerHTML='<p style=color:#FCA5A5>QR kod henuz olusmadi. Sayfayi yenileyin.</p>'" />
          <div class="loader"></div>
        </div>
        <div id="readyContainer" class="${ready ? '' : 'hidden'}">
          <p style="color:#6EE7B7">Sistem calisiyor. Mesajlar otomatik gonderilecek.</p>
        </div>
        <div style="margin-top: 20px;">
          <button class="btn btn-primary" onclick="location.reload()">Yenile</button>
          <button class="btn btn-danger" onclick="reconnect()">Yeniden Baglan (QR Sifirla)</button>
        </div>
        <p id="reconnectMsg" style="margin-top: 10px;"></p>
      </div>
      <script>
        async function reconnect() {
          document.getElementById('reconnectMsg').textContent = 'Yeniden baglaniliyor...';
          try {
            const res = await fetch('/api/whatsapp/reconnect', { method: 'POST' });
            const data = await res.json();
            document.getElementById('reconnectMsg').textContent = data.message || 'Tamam';
            setTimeout(() => location.reload(), 3000);
          } catch(e) {
            document.getElementById('reconnectMsg').textContent = 'Hata: ' + e.message;
          }
        }
        setInterval(async () => {
          const res = await fetch('/api/whatsapp/status');
          const data = await res.json();
          const statusDiv = document.getElementById('statusDiv');
          if (data.ready) {
            statusDiv.textContent = 'Whatsapp bagli ve hazir';
            statusDiv.className = 'status connected';
            document.getElementById('qrContainer').classList.add('hidden');
            document.getElementById('readyContainer').classList.remove('hidden');
          } else {
            statusDiv.textContent = 'QR kod bekleniyor...';
            statusDiv.className = 'status waiting';
            document.getElementById('qrContainer').classList.remove('hidden');
            document.getElementById('readyContainer').classList.add('hidden');
          }
        }, 3000);
      </script>
    </body>
    </html>
  `)
})

router.post('/reconnect', async (req, res) => {
  try {
    forceReconnect()
    res.json({ success: true, message: 'Session silindi, yeni QR kod olusturuluyor. Sayfayi yenileyin.' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
