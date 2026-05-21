const { Client, LocalAuth } = require('whatsapp-web.js')
const QRCode = require('qrcode')

let client = null
let isReady = false
let currentQR = null
let qrImageData = null

function getWhatsAppClient() {
  if (client) return client
  return null
}

function isWhatsAppReady() {
  return isReady
}

function getCurrentQR() {
  return currentQR
}

function getQRImage() {
  return qrImageData
}

function initWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session'
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })

  client.on('qr', async (qr) => {
    currentQR = qr
    qrImageData = await QRCode.toDataURL(qr)
    console.log('WhatsApp QR Kodu olusturuldu. /api/whatsapp/qr adresinden goruntuleyin.')
  })

  client.on('ready', () => {
    console.log('WhatsApp baglantisi hazir!')
    isReady = true
    currentQR = null
    qrImageData = null
  })

  client.on('disconnected', (reason) => {
    console.log('WhatsApp baglantisi kesildi:', reason)
    isReady = false
  })

  client.on('auth_failure', (msg) => {
    console.log('WhatsApp kimlik dogrulama hatasi:', msg)
    isReady = false
  })

  client.initialize()
  return client
}

async function sendWhatsAppMessage(phone, message) {
  if (!client || !isReady) {
    console.log('WhatsApp send: Client veya ready degil')
    return { success: false, message: 'WhatsApp hazir degil' }
  }

  try {
    console.log('WhatsApp send basliyor:', { phone, messageLength: message.length })
    
    let cleanPhone = phone.replace('+', '').replace(/\s/g, '').replace('-', '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1)
    }
    const chatId = `${cleanPhone}@c.us`
    console.log('Chat ID:', chatId)
    
    const chat = await client.getChatById(chatId)
    console.log('Chat bulundu:', !!chat)
    
    await client.sendMessage(chatId, message)
    console.log('Mesaj gonderildi basarili')
    return { success: true, message: 'Mesaj gonderildi' }
  } catch (error) {
    console.error('WhatsApp mesaj hatasi:', error.message, error.stack)
    return { success: false, message: error.message }
  }
}

module.exports = {
  initWhatsApp,
  getWhatsAppClient,
  isWhatsAppReady,
  sendWhatsAppMessage,
  getCurrentQR,
  getQRImage
}
