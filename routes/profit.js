// collectibles-prod/routes/profit.js
const express = require('express');
const db = require('../utils/db');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/profit-report', (req, res) => {
  db.all(`
    SELECT i.id, i.name, i.category, i.cost_price, i.modification_cost, ti.price, t.timestamp, t.vat_amount
    FROM inventory i
    LEFT JOIN transaction_items ti ON i.id = ti.item_id AND ti.direction = 'Out'
    LEFT JOIN transactions t ON ti.tx_id = t.tx_id
    WHERE t.type = 'Sale'
  `, (err, rows) => {
    if (err) {
      logger.error(`Profit report error: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    const report = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      cost: row.cost_price + (row.modification_cost || 0),
      soldPrice: row.price || null,
      profit: row.price ? row.price - (row.cost_price + (row.modification_cost || 0)) : null,
      vat: row.vat_amount || 0,
      date: row.timestamp || null
    }));
    res.json(report);
  });
});

module.exports = router;