// collectibles-prod/routes/items.js
const express = require('express');
const { promisify } = require('util');
const db = require('../utils/db');
const logger = require('../utils/logger');

const router = express.Router();
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

router.get('/items', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM inventory WHERE status = "In Stock"');
    res.json(rows);
  } catch (e) {
    logger.error(`Items fetch error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/items', async (req, res) => {
  const item = req.body;
  try {
    const result = await dbRun(
      'INSERT INTO inventory (name, attributes, condition, condition_history, category, value, value_last_updated, cost_price, input_vat, status, status_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        item.name,
        JSON.stringify(item.attributes),
        item.condition,
        JSON.stringify(item.condition_history),
        item.category,
        item.value,
        new Date().toISOString(),
        item.cost_price,
        item.input_vat || 0,
        'In Stock',
        new Date().toISOString()
      ]
    );
    res.json({ id: result.lastID });
  } catch (e) {
    logger.error(`Item add error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.put('/items/:id', async (req, res) => {
  const item = req.body;
  try {
    await dbRun(
      'UPDATE inventory SET name = ?, attributes = ?, condition = ?, condition_history = ?, category = ?, value = ?, value_last_updated = ?, cost_price = ?, input_vat = ? WHERE id = ?',
      [
        item.name,
        JSON.stringify(item.attributes),
        item.condition,
        JSON.stringify(item.condition_history),
        item.category,
        item.value,
        new Date().toISOString(),
        item.cost_price,
        item.input_vat || 0,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch (e) {
    logger.error(`Item update error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    logger.error(`Item delete error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/items/bulk', async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const text = file.buffer.toString('utf8');
    const items = JSON.parse(text);
    const stmt = db.prepare('INSERT INTO inventory (name, attributes, condition, condition_history, category, value, value_last_updated, cost_price, input_vat, status, status_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      await dbRun(stmt, [
        item.name,
        JSON.stringify(item.attributes),
        item.condition,
        JSON.stringify(item.condition_history || [{ type: item.condition, date: new Date().toISOString() }]),
        item.category,
        item.value,
        new Date().toISOString(),
        item.cost_price,
        item.input_vat || 0,
        'In Stock',
        new Date().toISOString()
      ]);
    }
    stmt.finalize();
    res.json({ message: `Added ${items.length} items` });
  } catch (e) {
    logger.error(`Bulk upload error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;