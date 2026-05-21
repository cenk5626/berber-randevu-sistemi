const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'berber.db')
const db = new sqlite3.Database(dbPath)

db.run('PRAGMA journal_mode = WAL')
db.run('PRAGMA foreign_keys = ON')

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          customer_email TEXT,
          service_type TEXT NOT NULL,
          appointment_date TEXT NOT NULL,
          appointment_time TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
          reminder_sent INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 30
        )
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          shop_name TEXT NOT NULL DEFAULT 'Berber Dukkani',
          shop_phone TEXT NOT NULL DEFAULT '',
          shop_address TEXT NOT NULL DEFAULT '',
          whatsapp_enabled INTEGER DEFAULT 0,
          working_hours_start TEXT NOT NULL DEFAULT '09:00',
          working_hours_end TEXT NOT NULL DEFAULT '18:00',
          slot_duration INTEGER NOT NULL DEFAULT 30
        )
      `, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

module.exports = { db, initDatabase, runAsync, getAsync, allAsync }
