const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const path = require('path')
const fs = require('fs')

let sock = null
let isReady = false
let currentQR = null
let qrImageData = null

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
  const sessionDir = path.join(__dirname, '..', 'whatsapp-session')
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  const startSock = async (forceNew) => {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
      emitOwnEvents: false,
      markOnlineOnConnect: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        currentQR = qr
        qrImageData = await QRCode.toDataURL(qr)
        console.log('WhatsApp QR kodu olusturuldu')
        isReady = false
      }

      if (connection === 'open') {
        console.log('WhatsApp baglantisi basarili!')
        isReady = true
        currentQR = null
        qrImageData = null
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        console.log('WhatsApp baglantisi kapandi. loggedOut:', isLoggedOut)
        isReady = false
        if (isLoggedOut) {
          currentQR = null
          qrImageData = null
          const SessionDir = path.join(__dirname, '..', 'whatsapp-session')
          if (fs.existsSync(SessionDir)) {
            fs.rmSync(SessionDir, { recursive: true, force: true })
          }
        }
        setTimeout(() => startSock(), 3000)
      }
    })
  }

  startSock()
  return sock
}

async function forceReconnect() {
  const SessionDir = path.join(__dirname, '..', 'whatsapp-session')
  if (fs.existsSync(SessionDir)) {
    fs.rmSync(SessionDir, { recursive: true, force: true })
  }
  isReady = false
  currentQR = null
  qrImageData = null
  setTimeout(() => initWhatsApp(), 1000)
}

async function sendWhatsAppMessage(phone, message) {
  try {
    let cleanPhone = phone.replace('+', '').replace(/\s/g, '').replace('-', '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1)
    }
    const jid = `${cleanPhone}@s.whatsapp.net`

    if (!sock) {
      return { success: false, message: 'WhatsApp baglantisi yok' }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await sock.sendMessage(jid, { text: message })
        return { success: true, message: 'Mesaj gonderildi' }
      } catch (error) {
        console.error(`WhatsApp hata (deneme ${attempt}):`, error.message)
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 3000))
        }
      }
    }

    return { success: false, message: '3 deneme basarisiz' }
  } catch (error) {
    console.error('WhatsApp send hatasi:', error.message)
    return { success: false, message: error.message }
  }
}

module.exports = {
  initWhatsApp,
  isWhatsAppReady,
  sendWhatsAppMessage,
  getCurrentQR,
  getQRImage,
  forceReconnect
}
