// collectibles-prod/public/transactions.js
import { apiFetch, showAlert, getFormData } from './utils.js';

export function initTransactions() {
  document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tx = getFormData(e.target);
    tx.items = [{ item_id: parseInt(tx.item_id), price: parseFloat(tx.price), direction: 'Out' }];
    delete tx.item_id;
    delete tx.price;

    try {
      const data = await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(tx) });
      showAlert('Success', `Added transaction: ${data.tx_id}`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  });
}

export function updateTransactionDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('current-date').textContent = today;
  document.getElementById('transaction-date').value = today;
}