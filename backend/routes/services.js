const express = require('express')
const router = express.Router()
const { getAsync, runAsync, allAsync } = require('../db/database')

router.get('/', async (req, res) => {
  try {
    const services = await allAsync('SELECT * FROM services ORDER BY id ASC')
    res.json({ success: true, data: services })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hizmetler getirilemedi', error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, price, duration_minutes } = req.body

    if (!name || price === undefined || duration_minutes === undefined) {
      return res.status(400).json({ success: false, message: 'Hizmet adi, fiyat ve sure zorunludur' })
    }

    const result = await runAsync(
      'INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)',
      [name, price, duration_minutes]
    )

    const newService = await getAsync('SELECT * FROM services WHERE id = ?', [result.lastID])
    res.status(201).json({ success: true, data: newService })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hizmet eklenemedi', error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, duration_minutes } = req.body

    const existing = await getAsync('SELECT * FROM services WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Hizmet bulunamadi' })
    }

    const updates = []
    const params = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(name)
    }
    if (price !== undefined) {
      updates.push('price = ?')
      params.push(price)
    }
    if (duration_minutes !== undefined) {
      updates.push('duration_minutes = ?')
      params.push(duration_minutes)
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Guncellenecek alan belirtilmedi' })
    }

    params.push(id)
    await runAsync(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params)

    const updated = await getAsync('SELECT * FROM services WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hizmet guncellenemedi', error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const existing = await getAsync('SELECT * FROM services WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Hizmet bulunamadi' })
    }

    await runAsync('DELETE FROM services WHERE id = ?', [id])
    res.json({ success: true, message: 'Hizmet silindi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hizmet silinemedi', error: error.message })
  }
})

module.exports = router
