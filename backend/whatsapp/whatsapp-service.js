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
  const puppeteerOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  }

  const chromiumPath = process.env.CHROME_PATH || '/usr/bin/chromium'
  const fs = require('fs')
  if (fs.existsSync(chromiumPath)) {
    puppeteerOptions.executablePath = chromiumPath
    console.log('Chromium bulundu:', chromiumPath)
  } else {
    console.log('Chromium bulunamadi, varsayilan kullanilacak')
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session'
    }),
    puppeteer: puppeteerOptions
  })

  client.on('qr', async (qr) => {
    currentQR = qr
    qrImageData = await QRCode.toDataURL(qr)
    console.log('WhatsApp QR Kodu olusturuldu.')
  })

  client.on('ready', () => {
    console.log('WhatsApp baglantisi hazir!')
    isReady = true
    currentQR = null
    qrImageData = null
  })

  client.on('disconnected', async (reason) => {
    console.log('WhatsApp baglantisi kesildi:', reason)
    isReady = false
    currentQR = null
    qrImageData = null
    console.log('WhatsApp yeniden baglaniyor...')
    setTimeout(() => {
      try {
        client.initialize()
      } catch (e) {
        console.error('Yeniden baglanma hatasi:', e.message)
      }
    }, 5000)
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`WhatsApp send deneme ${attempt}:`, { phone, messageLength: message.length })
      
      let cleanPhone = phone.replace('+', '').replace(/\s/g, '').replace('-', '')
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '90' + cleanPhone.substring(1)
      }
      const chatId = `${cleanPhone}@c.us`
      console.log('Chat ID:', chatId)
      
      await client.sendMessage(chatId, message)
      console.log('Mesaj gonderildi basarili')
      return { success: true, message: 'Mesaj gonderildi' }
    } catch (error) {
      console.error(`WhatsApp mesaj hatasi (deneme ${attempt}):`, error.message)
      if (attempt < 3) {
        console.log('5 saniye bekleniyor...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }
  
  return { success: false, message: 'Mesaj gonderilemedi, 3 deneme basarisiz' }
}

module.exports = {
  initWhatsApp,
  getWhatsAppClient,
  isWhatsAppReady,
  sendWhatsAppMessage,
  getCurrentQR,
  getQRImage
}
