const express = require('express')
const router = express.Router()
const { sendWhatsAppMessage, isWhatsAppReady } = require('../whatsapp/whatsapp-service')

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

module.exports = router
