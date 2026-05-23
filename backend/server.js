require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDatabase, getAsync, runAsync } = require('./db/database')
const { initWhatsApp, isWhatsAppReady } = require('./whatsapp/whatsapp-service')

const appointmentsRouter = require('./routes/appointments')
const servicesRouter = require('./routes/services')
const settingsRouter = require('./routes/settings')
const whatsappRouter = require('./routes/whatsapp')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/appointments', appointmentsRouter)
app.use('/api/services', servicesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/whatsapp', whatsappRouter)

const frontendPath = path.join(__dirname, '..', 'frontend')
app.use(express.static(frontendPath))

app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin', 'login.html'))
})

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin', req.path.replace('/admin/', '')))
})

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

const defaultServices = [
  { name: 'Sac Trasi', price: 150, duration_minutes: 30 },
  { name: 'Sakal Trasi', price: 100, duration_minutes: 20 },
  { name: 'Sac+Sakal', price: 220, duration_minutes: 45 },
  { name: 'Cocuk Trasi', price: 120, duration_minutes: 25 },
  { name: 'Sac Yikama', price: 80, duration_minutes: 15 },
  { name: 'Sac Boyama', price: 300, duration_minutes: 60 }
]

const insertDefaultServices = async () => {
  const existingServices = await getAsync('SELECT COUNT(*) as count FROM services')
  if (existingServices.count === 0) {
    for (const service of defaultServices) {
      await runAsync(
        'INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)',
        [service.name, service.price, service.duration_minutes]
      )
    }
  }
}

const insertDefaultSettings = async () => {
  const existingSettings = await getAsync('SELECT COUNT(*) as count FROM settings')
  if (existingSettings.count === 0) {
    await runAsync(
      `INSERT INTO settings (shop_name, shop_phone, shop_address, whatsapp_enabled, working_hours_start, working_hours_end, slot_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Berber Dukkani', '+905551234567', 'Ornek Mah. Ornek Cad. No:1', 1, '09:00', '18:00', 30]
    )
  }
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint bulunamadi' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: 'Sunucu hatasi', error: err.message })
})

const startServer = async () => {
  await initDatabase()

  try {
    await runAsync('ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0')
  } catch (e) {
    if (!e.message.includes('duplicate')) {
      console.log('reminder_sent kolonu zaten mevcut')
    }
  }

  await insertDefaultSettings()
  await insertDefaultServices()

  const { startReminderScheduler } = require('./scheduler/reminder-scheduler')
  startReminderScheduler()

  initWhatsApp()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
