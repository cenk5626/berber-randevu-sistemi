const cron = require('node-cron')
const { allAsync, runAsync } = require('../db/database')
const { sendWhatsAppMessage, isWhatsAppReady } = require('../whatsapp/whatsapp-service')

const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

function getGunAdi(dateStr) {
  const d = new Date(dateStr)
  return gunler[d.getDay()]
}

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const period = h < 12 ? 'ÖÖ' : 'ÖS'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function startReminderScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

      const currentDate = now.toISOString().split('T')[0]
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const reminderTime = `${String(twoHoursLater.getHours()).padStart(2, '0')}:${String(twoHoursLater.getMinutes()).padStart(2, '0')}`

      const upcomingAppointments = await allAsync(
        `SELECT * FROM appointments
         WHERE appointment_date = ?
         AND appointment_time <= ?
         AND appointment_time > ?
         AND status IN (?, ?)
         AND reminder_sent = 0`,
        [currentDate, reminderTime, currentTime, 'pending', 'confirmed']
      )

      for (const apt of upcomingAppointments) {
        if (!isWhatsAppReady()) {
          console.log('WhatsApp hazır değil, hatırlatma gönderilemedi')
          continue
        }

        const services = await allAsync('SELECT * FROM services WHERE name = ?', [apt.service_type])
        const price = services.length > 0 ? services[0].price : 0
        const gunAdi = getGunAdi(apt.appointment_date)
        const saat12 = formatTime12(apt.appointment_time)

        const message = `Sayın ${apt.customer_name}, ${apt.appointment_date} ${gunAdi} günü saat ${saat12}'teki ${apt.service_type} randevunuz yaklaşmaktadır. Randevuya geç kalmamanız önemle rica olunur.`

        const result = await sendWhatsAppMessage(apt.customer_phone, message)

        if (result.success) {
          await runAsync('UPDATE appointments SET reminder_sent = 1 WHERE id = ?', [apt.id])
          console.log(`Hatırlatma gönderildi: ${apt.customer_name} - ${apt.appointment_time}`)
        } else {
          console.log(`Hatırlatma gönderilemedi: ${apt.customer_name} - ${result.message}`)
        }
      }
    } catch (error) {
      console.error('Hatırlatma hatası:', error.message)
    }
  })

  console.log('Randevu hatırlatma başlatıldı (2 saat önce)')
}

module.exports = { startReminderScheduler }
