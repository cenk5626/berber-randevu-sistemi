const express = require('express')
const router = express.Router()
const { getAsync, runAsync } = require('../db/database')

router.get('/', async (req, res) => {
  try {
    const settings = await getAsync('SELECT * FROM settings WHERE id = 1')
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Ayarlar bulunamadi' })
    }
    res.json({ success: true, data: settings })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ayarlar getirilemedi', error: error.message })
  }
})

router.put('/', async (req, res) => {
  try {
    const { shop_name, shop_phone, shop_address, whatsapp_enabled, working_hours_start, working_hours_end, slot_duration } = req.body

    const existing = await getAsync('SELECT * FROM settings WHERE id = 1')
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ayarlar bulunamadi' })
    }

    const updates = []
    const params = []

    if (shop_name !== undefined) {
      updates.push('shop_name = ?')
      params.push(shop_name)
    }
    if (shop_phone !== undefined) {
      updates.push('shop_phone = ?')
      params.push(shop_phone)
    }
    if (shop_address !== undefined) {
      updates.push('shop_address = ?')
      params.push(shop_address)
    }
    if (whatsapp_enabled !== undefined) {
      updates.push('whatsapp_enabled = ?')
      params.push(Number(whatsapp_enabled))
    }
    if (working_hours_start !== undefined) {
      updates.push('working_hours_start = ?')
      params.push(working_hours_start)
    }
    if (working_hours_end !== undefined) {
      updates.push('working_hours_end = ?')
      params.push(working_hours_end)
    }
    if (slot_duration !== undefined) {
      updates.push('slot_duration = ?')
      params.push(slot_duration)
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Guncellenecek alan belirtilmedi' })
    }

    params.push(1)
    await runAsync(`UPDATE settings SET ${updates.join(', ')} WHERE id = ?`, params)

    const updated = await getAsync('SELECT * FROM settings WHERE id = 1')
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ayarlar guncellenemedi', error: error.message })
  }
})

module.exports = router
