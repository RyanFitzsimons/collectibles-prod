// collectibles-prod/utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/collectibles.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attributes TEXT, -- JSON: { platform, region }
      condition TEXT, -- Single value: "CIB", "Loose", etc.
      condition_history TEXT, -- JSON array of { type, date }
      tags TEXT, -- JSON array
      category TEXT NOT NULL,
      value REAL NOT NULL,
      value_last_updated TEXT,
      value_history TEXT, -- JSON array of { date, value }
      cost_price REAL NOT NULL,
      modification_cost REAL DEFAULT 0,
      input_vat REAL DEFAULT 0,
      acquisition TEXT, -- JSON: { source, date }
      trade_origin_tx_id INTEGER,
      location TEXT,
      status TEXT DEFAULT 'In Stock',
      status_updated TEXT,
      image TEXT,
      notes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      total_value REAL,
      payment_method TEXT,
      cash_amount REAL,
      timestamp TEXT NOT NULL, -- Renamed from 'date' to match routes
      vat_amount REAL DEFAULT 0,
      vat_applicable INTEGER DEFAULT 0,
      shipping REAL DEFAULT 0,
      fees REAL DEFAULT 0,
      notes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      tx_id INTEGER,
      item_id INTEGER,
      price REAL NOT NULL,
      market_value REAL,
      direction TEXT NOT NULL, -- 'In' or 'Out'
      FOREIGN KEY (tx_id) REFERENCES transactions(tx_id),
      FOREIGN KEY (item_id) REFERENCES inventory(id),
      PRIMARY KEY (tx_id, item_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tax_status (
      status_id INTEGER PRIMARY KEY CHECK (status_id = 1),
      vat_registration_date TEXT,
      vat_deregistration_date TEXT,
      revenue_threshold REAL DEFAULT 90000
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO tax_status (status_id, revenue_threshold) VALUES (1, 90000)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      date TEXT NOT NULL,
      value_change REAL NOT NULL,
      reason TEXT,
      FOREIGN KEY (item_id) REFERENCES inventory(id)
    )
  `);
});

module.exports = db;