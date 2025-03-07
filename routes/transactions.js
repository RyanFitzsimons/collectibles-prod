// collectibles-prod/routes/transactions.js
const express = require('express');
const { promisify } = require('util');
const db = require('../utils/db');
const logger = require('../utils/logger');

const router = express.Router();
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

router.post('/', async (req, res) => {
  const tx = req.body;
  try {
    const taxStatus = await dbGet('SELECT * FROM tax_status WHERE status_id = 1');
    const regDate = taxStatus.vat_registration_date ? new Date(taxStatus.vat_registration_date) : null;
    const deregDate = taxStatus.vat_deregistration_date ? new Date(taxStatus.vat_deregistration_date) : null;
    const txDate = new Date(tx.timestamp || new Date());

    let vatTotal = 0;
    if (regDate && txDate >= regDate && (!deregDate || txDate < deregDate)) {
      const inventory = await dbAll('SELECT * FROM inventory');
      tx.items.forEach(ti => {
        if (ti.direction === 'Out') {
          const item = inventory.find(i => i.id === ti.item_id);
          if (!item) throw new Error(`Item ID ${ti.item_id} not found`);
          const margin = ti.price - (item.cost_price + (item.modification_cost || 0));
          if (margin > 0) vatTotal += Math.round(margin * 0.16666666666666666); // 20% VAT on margin
        }
      });
    }

    const sql = `
      INSERT INTO transactions (type, total_value, payment_method, cash_amount, timestamp, vat_amount, vat_applicable)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const totalValue = tx.items.reduce((sum, ti) => sum + ti.price, 0);
    const cashAmount = tx.type === 'Sale' ? totalValue : 0;
    const params = [
      tx.type,
      totalValue,
      tx.payment_method || null,
      cashAmount,
      tx.timestamp || new Date().toISOString(),
      vatTotal,
      vatTotal > 0 ? 1 : 0
    ];
    
    db.run(sql, params, function (err) {
      if (err) {
        logger.error(`Failed to add transaction: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
      const txId = this.lastID;

      const itemsSql = `INSERT INTO transaction_items (tx_id, item_id, price, market_value, direction) VALUES (?, ?, ?, ?, ?)`;
      const statusSql = `UPDATE inventory SET status = ?, status_updated = ? WHERE id = ?`;
      tx.items.forEach(item => {
        db.run(itemsSql, [txId, item.item_id, item.price, item.market_value || item.price, item.direction], (err) => {
          if (err) {
            logger.error(`Failed to add transaction item ${item.item_id}: ${err.message}`);
            return res.status(500).json({ error: err.message });
          }
          if (item.direction === 'Out') {
            db.run(statusSql, ['Sold', new Date().toISOString(), item.item_id], (err) => {
              if (err) logger.error(`Failed to update status for item ${item.item_id}: ${err.message}`);
            });
          }
        });
      });

      logger.info(`Added transaction ${txId} with ${tx.items.length} items`);
      res.status(201).json({ tx_id: txId, ...tx });
    });
  } catch (e) {
    logger.error(`Transaction failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;