const express = require('express')
const router = express.Router()
const { getAsync, runAsync, allAsync } = require('../db/database')
const { sendWhatsAppMessage } = require('../whatsapp/whatsapp-service')

const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

function getGunAdi(dateStr) {
  const d = new Date(dateStr)
  return gunler[d.getDay()]
}

router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query
    let query = 'SELECT * FROM appointments'
    const params = []
    const conditions = []

    if (date) {
      conditions.push('appointment_date = ?')
      params.push(date)
    }
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY appointment_date DESC, appointment_time ASC'

    const appointments = await allAsync(query, params)
    res.json({ success: true, data: appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Randevular getirilemedi', error: error.message })
  }
})

router.get('/available', async (req, res) => {
  try {
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ success: false, message: 'Tarih parametresi gerekli (date=YYYY-MM-DD)' })
    }

    const settings = await getAsync('SELECT * FROM settings WHERE id = 1')
    if (!settings) {
      return res.status(500).json({ success: false, message: 'Ayarlar bulunamadi' })
    }

    const [startHour, startMinute] = settings.working_hours_start.split(':').map(Number)
    const [endHour, endMinute] = settings.working_hours_end.split(':').map(Number)
    const slotDuration = settings.slot_duration

    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    const allSlots = []
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += slotDuration) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }

    const bookedAppointments = await allAsync(
      'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status IN (?, ?)',
      [date, 'pending', 'confirmed']
    )

    const bookedTimes = bookedAppointments.map(a => a.appointment_time)
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot))

    res.json({ success: true, data: { date, available: availableSlots, booked: bookedTimes } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Bos saatler getirilemedi', error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_email, service_type, appointment_date, appointment_time } = req.body

    if (!customer_name || !customer_phone || !service_type || !appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, message: 'Musteri adi, telefon, hizmet turu, tarih ve saat zorunludur' })
    }

    const settings = await getAsync('SELECT * FROM settings WHERE id = 1')
    if (!settings) {
      return res.status(500).json({ success: false, message: 'Ayarlar bulunamadi' })
    }

    const [reqHour, reqMinute] = appointment_time.split(':').map(Number)
    const reqTotalMinutes = reqHour * 60 + reqMinute
    const [startHour, startMinute] = settings.working_hours_start.split(':').map(Number)
    const [endHour, endMinute] = settings.working_hours_end.split(':').map(Number)
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    if (reqTotalMinutes < startTotalMinutes || reqTotalMinutes >= endTotalMinutes) {
      return res.status(400).json({ success: false, message: 'Secilen saat calisma saatleri disinda' })
    }

    const conflict = await getAsync(
      'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status IN (?, ?)',
      [appointment_date, appointment_time, 'pending', 'confirmed']
    )

    if (conflict) {
      return res.status(409).json({ success: false, message: 'Bu saatte zaten bir randevu var' })
    }

    const result = await runAsync(
      'INSERT INTO appointments (customer_name, customer_phone, customer_email, service_type, appointment_date, appointment_time) VALUES (?, ?, ?, ?, ?, ?)',
      [customer_name, customer_phone, customer_email || null, service_type, appointment_date, appointment_time]
    )

    const newAppointment = await getAsync('SELECT * FROM appointments WHERE id = ?', [result.lastID])

    const services = await allAsync('SELECT * FROM services WHERE name = ?', [service_type])
    const price = services.length > 0 ? services[0].price : 0
    const message = `Sayın ${customer_name}, ${appointment_date} ${getGunAdi(appointment_date)} günü saat ${appointment_time}'de ${service_type} randevunuz bulunmaktadır. Ücreti ${price}₺'dir. Randevu saatinizde dükkanımızda bulununuz. İptal veya değişiklik için bizimle iletişime geçiniz.`
    sendWhatsAppMessage(customer_phone, message)

    res.status(201).json({ success: true, data: newAppointment })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Randevu olusturulamadi', error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Gecerli bir durum belirtilmelidir: pending, confirmed, cancelled, completed' })
    }

    const existing = await getAsync('SELECT * FROM appointments WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadi' })
    }

    await runAsync('UPDATE appointments SET status = ? WHERE id = ?', [status, id])
    const updated = await getAsync('SELECT * FROM appointments WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Randevu guncellenemedi', error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const existing = await getAsync('SELECT * FROM appointments WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadi' })
    }

    await runAsync('DELETE FROM appointments WHERE id = ?', [id])
    res.json({ success: true, message: 'Randevu silindi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Randevu silinemedi', error: error.message })
  }
})

module.exports = router
