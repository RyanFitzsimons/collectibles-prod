// collectibles-prod/routes/vat.js
const express = require('express');
const { promisify } = require('util');
const db = require('../utils/db');

const router = express.Router();
const dbAll = promisify(db.all.bind(db));

router.get('/vat-return', async (req, res) => {
  try {
    const { year, quarter } = req.query;
    if (!year || !quarter || !['1', '2', '3', '4'].includes(quarter)) {
      return res.status(400).json({ error: 'Year and quarter (1-4) required' });
    }

    const taxYear = parseInt(year, 10);
    const quarterNum = parseInt(quarter, 10);
    let startDate, endDate;
    switch (quarterNum) {
      case 1: startDate = new Date(taxYear, 0, 1).toISOString().split('T')[0]; endDate = new Date(taxYear, 2, 31).toISOString().split('T')[0]; break;
      case 2: startDate = new Date(taxYear, 3, 1).toISOString().split('T')[0]; endDate = new Date(taxYear, 5, 30).toISOString().split('T')[0]; break;
      case 3: startDate = new Date(taxYear, 6, 1).toISOString().split('T')[0]; endDate = new Date(taxYear, 8, 30).toISOString().split('T')[0]; break;
      case 4: startDate = new Date(taxYear, 9, 1).toISOString().split('T')[0]; endDate = new Date(taxYear, 11, 31).toISOString().split('T')[0]; break;
    }

    const transactions = await dbAll('SELECT * FROM transactions WHERE timestamp BETWEEN ? AND ?', [startDate, endDate]);
    const transactionItems = await dbAll('SELECT * FROM transaction_items');
    const inventory = await dbAll('SELECT * FROM inventory');

    const txList = transactions.map(tx => ({
      ...tx,
      items: transactionItems.filter(ti => ti.tx_id === tx.tx_id)
    }));

    const soldItemIds = new Set(txList
      .filter(tx => tx.timestamp >= startDate && tx.timestamp <= endDate)
      .flatMap(tx => tx.items)
      .filter(ti => ti.direction === 'Out')
      .map(ti => ti.item_id));
    const outputVat = txList
      .filter(tx => tx.vat_applicable)
      .reduce((sum, tx) => sum + (tx.vat_amount || 0), 0);
    const inputVat = inventory
      .filter(item => soldItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.input_vat || 0), 0);
    const netVat = outputVat - inputVat;

    res.json({ year: taxYear, quarter: quarterNum, period: `${startDate} to ${endDate}`, outputVat, inputVat, netVat });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;