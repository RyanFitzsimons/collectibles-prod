// collectibles-prod/public/reports.js
import { apiFetch, getFormData } from './utils.js';

export async function fetchProfitReport() {
  try {
    const data = await apiFetch('/profit-report');
    const tbody = document.querySelector('#profit-table tbody');
    tbody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.category}</td>
        <td>${row.cost.toFixed(2)}</td>
        <td>${row.soldPrice ? row.soldPrice.toFixed(2) : 'N/A'}</td>
        <td>${row.profit ? row.profit.toFixed(2) : 'N/A'}</td>
        <td>${row.vat.toFixed(2)}</td>
        <td>${row.date || 'N/A'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Profit report error:', err);
  }
}

export async function fetchTaxReport() {
  try {
    const data = await apiFetch('/tax-report');
    document.getElementById('tax-result').innerHTML = `
      <p>Profit: £${(data.profit || 0).toFixed(2)}</p>
      <p>Income Tax: £${(data.incomeTax || 0).toFixed(2)}</p>
      <p>NICs: £${(data.nics || 0).toFixed(2)}</p>
      <p>VAT: £${(data.vat || 0).toFixed(2)}</p>
      <p>Rolling Revenue (last 12 months): £${(data.rollingRevenue || 0).toFixed(2)}</p>
      <p>VAT Status: ${data.vatStatus || 'Unknown'}</p>
    `;
  } catch (err) {
    document.getElementById('tax-result').textContent = `Error: ${err.message}`;
  }
}

export function initVatReport() {
  document.getElementById('vat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { year, quarter } = getFormData(e.target);
    try {
      const data = await apiFetch(`/vat-return?year=${year}&quarter=${quarter}`);
      document.getElementById('vat-result').innerHTML = `
        <p>Year: ${data.year}</p>
        <p>Quarter: Q${data.quarter}</p>
        <p>Period: ${data.period}</p>
        <p>Output VAT: £${(data.outputVat || 0).toFixed(2)}</p>
        <p>Input VAT: £${(data.inputVat || 0).toFixed(2)}</p>
        <p>Net VAT: £${(data.netVat || 0).toFixed(2)}</p>
      `;
    } catch (err) {
      document.getElementById('vat-result').textContent = `Error: ${err.message}`;
    }
  });
}