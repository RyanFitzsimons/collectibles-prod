// collectibles-prod/routes/tax.js
const express = require('express');
const { promisify } = require('util');
const db = require('../utils/db');

const router = express.Router();
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

router.get('/tax-report', async (req, res) => {
  try {
    const taxStatus = await dbGet('SELECT * FROM tax_status WHERE status_id = 1');
    const transactions = await dbAll('SELECT * FROM transactions WHERE type IN ("Sale", "Trade-Out")');
    const transactionItems = await dbAll('SELECT * FROM transaction_items');
    const inventory = await dbAll('SELECT * FROM inventory');
    const adjustments = await dbAll('SELECT * FROM inventory_adjustments');

    const earliestTxDate = transactions.length > 0 ? new Date(transactions[0].timestamp) : new Date();
    const taxYearStart = new Date(earliestTxDate.getFullYear(), 0, 1).toISOString().split('T')[0];
    const taxYearEnd = new Date(earliestTxDate.getFullYear() + 1, 0, 1).toISOString().split('T')[0];

    const txList = transactions.map(tx => ({
      ...tx,
      items: transactionItems.filter(ti => ti.tx_id === tx.tx_id)
    }));

    const regDate = taxStatus.vat_registration_date ? new Date(taxStatus.vat_registration_date) : null;
    const deregDate = taxStatus.vat_deregistration_date ? new Date(taxStatus.vat_deregistration_date) : null;
    txList.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      if (regDate && txDate >= regDate && (!deregDate || txDate < deregDate) && !tx.vat_applicable) {
        let vatTotal = 0;
        tx.items.forEach(ti => {
          if (ti.direction === 'Out') {
            const item = inventory.find(i => i.id === ti.item_id);
            const margin = ti.price - (item.cost_price + (item.modification_cost || 0));
            if (margin > 0) vatTotal += Math.round(margin * 0.16666666666666666); // 20% VAT on margin
          }
        });
        tx.vat_applicable = 1;
        tx.vat_amount = vatTotal;
        db.run('UPDATE transactions SET vat_applicable = ?, vat_amount = ? WHERE tx_id = ?', [1, vatTotal, tx.tx_id]);
      }
    });

    const revenue = txList
      .filter(tx => tx.timestamp >= taxYearStart && tx.timestamp <= taxYearEnd)
      .reduce((sum, tx) => sum + tx.items.reduce((itemSum, ti) => itemSum + (ti.direction === 'Out' ? ti.price : 0), 0), 0);

    const soldItemIds = new Set(txList
      .filter(tx => tx.timestamp >= taxYearStart && tx.timestamp <= taxYearEnd)
      .flatMap(tx => tx.items)
      .filter(ti => ti.direction === 'Out')
      .map(ti => ti.item_id));
    const costOfGoodsSold = inventory
      .filter(item => soldItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.cost_price + (item.modification_cost || 0)), 0);

    const adjustmentsLoss = adjustments
      .filter(adj => adj.date >= taxYearStart && adj.date <= taxYearEnd)
      .reduce((sum, adj) => sum + Math.abs(adj.value_change), 0);

    const profit = revenue - costOfGoodsSold - adjustmentsLoss || 0;
    const personalAllowance = profit > 100000 ? Math.max(12570 - ((profit - 100000) / 2), 0) : 12570;
    const taxableProfit = Math.max(profit - personalAllowance, 0);
    let incomeTax = 0;

    if (taxableProfit > 0) {
      const basicRateLimit = 50270 - personalAllowance;
      const higherRateLimit = 125140 - personalAllowance;
      if (taxableProfit <= basicRateLimit) incomeTax = taxableProfit * 0.2;
      else if (taxableProfit <= higherRateLimit) incomeTax = (basicRateLimit * 0.2) + ((taxableProfit - basicRateLimit) * 0.4);
      else incomeTax = (basicRateLimit * 0.2) + ((higherRateLimit - basicRateLimit) * 0.4) + ((taxableProfit - higherRateLimit) * 0.45);
    }

    const class2NIC = profit > 6725 ? 179.40 : 0;
    const class4NIC = taxableProfit <= 50270 ? taxableProfit * 0.09 : (50270 - 12570) * 0.09 + (taxableProfit - 50270) * 0.02;
    const nics = class2NIC + class4NIC;

    const outputVat = txList
      .filter(tx => tx.vat_applicable && tx.timestamp >= taxYearStart && tx.timestamp <= taxYearEnd)
      .reduce((sum, tx) => sum + (tx.vat_amount || 0), 0);
    const inputVat = inventory
      .filter(item => soldItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.input_vat || 0), 0);
    const vat = outputVat - inputVat;

    const currentDate = new Date().toISOString();
    const startDate = new Date(currentDate); startDate.setFullYear(startDate.getFullYear() - 1);
    const rollingRevenue = txList
      .filter(tx => tx.timestamp >= startDate.toISOString() && tx.timestamp <= currentDate)
      .reduce((sum, tx) => sum + (tx.cash_amount || 0), 0);
    const vatStatus = rollingRevenue > taxStatus.revenue_threshold ? 'Register' : 'Below Threshold';

    res.json({ profit, incomeTax, nics, vat, rollingRevenue, vatStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;