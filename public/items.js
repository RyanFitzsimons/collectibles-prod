// collectibles-prod/public/items.js
import { apiFetch, showAlert, getFormData } from './utils.js';

const categoryAttributes = {
  "Pokémon": { platform: "set", region: "series" },
  "Video Games": { platform: "platform", region: "region" },
  "Comics": { platform: "title", region: "issue" },
  "Football Jerseys": { platform: "team", region: "season" },
  "GAA Jerseys": { platform: "county", region: "year" },
  "Coins": { platform: "denomination", region: "year" },
  "Video Game Consoles": { platform: "model", region: "region" },
  "Electronics": { platform: "type", region: "brand" },
  "Other TCGs": { platform: "game", region: "set" },
  "Sports Cards": { platform: "sport", region: "player" }
};

export function initItems() {
  document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = getFormData(e.target);
    const attrMap = categoryAttributes[item.category];
    item.attributes = { [attrMap.platform]: item.platform, [attrMap.region]: item.region };
    item.condition_history = [{ type: item.condition, date: new Date().toISOString() }];
    delete item.platform;
    delete item.region;

    try {
      const data = await apiFetch('/items', { method: 'POST', body: JSON.stringify(item) });
      showAlert('Success', `Added item: ${data.id}`, 'success');
      e.target.reset();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  });

  document.getElementById('bulk-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const data = await apiFetch('/items/bulk', { method: 'POST', body: formData });
      showAlert('Success', data.message, 'success');
    } catch (err) {
      showAlert('Error', JSON.stringify(err.message), 'error');
    }
  });

  document.getElementById('edit-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = getFormData(e.target);
    const attrMap = categoryAttributes[item.category];
    item.attributes = { [attrMap.platform]: item.platform, [attrMap.region]: item.region };
    item.value = parseFloat(item.value);
    item.cost_price = parseFloat(item.cost_price);
    item.input_vat = parseFloat(item.input_vat) || 0;
    const oldConditionHistory = JSON.parse(e.target.dataset.conditionHistory || '[]');
    item.condition_history = oldConditionHistory;
    const lastCondition = oldConditionHistory.length > 0 ? oldConditionHistory[oldConditionHistory.length - 1].type : null;
    if (item.condition !== lastCondition) {
      item.condition_history.push({ type: item.condition, date: new Date().toISOString() });
    }
    delete item.platform;
    delete item.region;

    try {
      const data = await apiFetch(`/items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) });
      showAlert('Success', `Updated item: ${item.id}`, 'success');
      document.getElementById('edit-form-container').style.display = 'none';
      fetchItems();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  });
}

export async function fetchItems() {
  const tbody = document.querySelector('#items-table tbody');
  if (!tbody) return;
  try {
    const data = await apiFetch('/items');
    tbody.innerHTML = '';
    data.forEach((row, index) => {
      const attributes = JSON.parse(row.attributes || '{}');
      const conditionHistory = JSON.parse(row.condition_history || '[]');
      const attrMap = categoryAttributes[row.category] || { platform: "platform", region: "region" };
      const tr = document.createElement('tr');
      tr.dataset.item = JSON.stringify(row);
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.category}</td>
        <td>${row.value.toFixed(2)}</td>
        <td>${row.cost_price.toFixed(2)}</td>
        <td>${attributes[attrMap.platform] || 'N/A'}</td>
        <td>${attributes[attrMap.region] || 'N/A'}</td>
        <td>${row.condition || 'N/A'}</td>
        <td>${conditionHistory.map(h => `${h.type} (${h.date.slice(0, 10)})`).join(', ') || 'N/A'}</td>
        <td>${(row.input_vat || 0).toFixed(2)}</td>
        <td>${row.status}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-index="${index}">Edit</button>
          <button onclick="deleteItem(${row.id})" class="btn btn-sm btn-danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = JSON.parse(btn.closest('tr').dataset.item);
        const attributes = JSON.parse(row.attributes || '{}');
        const conditionHistory = JSON.parse(row.condition_history || '[]');
        const attrMap = categoryAttributes[row.category] || { platform: "platform", region: "region" };
        editItem(row.id, row.name, row.category, row.value, row.cost_price, attributes[attrMap.platform] || '',
          attributes[attrMap.region] || '', row.condition || '', JSON.stringify(conditionHistory), row.input_vat || 0);
      });
    });
  } catch (err) {
    console.error('Items fetch error:', err);
  }
}

function editItem(id, name, category, value, cost_price, platform, region, condition, condition_history, input_vat) {
  const form = document.getElementById('edit-item-form');
  form.id.value = id;
  form.name.value = name;
  form.category.value = category;
  form.value.value = value;
  form.cost_price.value = cost_price;
  form.platform.value = platform;
  form.region.value = region;
  form.condition.value = condition;
  form.input_vat.value = input_vat;
  form.dataset.conditionHistory = condition_history;
  document.getElementById('edit-form-container').style.display = 'block';
}

export async function deleteItem(id) {
  const result = await showAlert('Are you sure?', `Delete item ${id}? This cannot be undone.`, 'warning', {
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  });
  if (result.isConfirmed) {
    try {
      await apiFetch(`/items/${id}`, { method: 'DELETE' });
      showAlert('Deleted', `Item ${id} has been deleted`, 'success');
      fetchItems();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  }
}