// collectibles-prod/public/items.js
import { apiFetch, showAlert, getFormData } from './utils.js';

let categoryRules = {};

async function fetchCategoryRules() {
  try {
    categoryRules = await apiFetch('/categories');
  } catch (err) {
    console.error('Failed to fetch category rules:', err);
    showAlert('Error', 'Could not load category rules', 'error');
  }
}

function updateFormFields(category) {
  const rules = categoryRules[category] || { attributes: { required: [], optional: [] }, condition: { required: ['type'] } };
  const attributesContainer = document.getElementById('attributes-container');
  attributesContainer.innerHTML = '';

  // Required attributes
  rules.attributes.required.forEach(attr => {
    const div = document.createElement('div');
    div.className = 'col-md-6';
    div.innerHTML = `
      <label>${attr.charAt(0).toUpperCase() + attr.slice(1)}: 
        <input type="text" class="form-control" name="${attr}" required>
      </label>
    `;
    attributesContainer.appendChild(div);
  });

  // Optional attributes
  rules.attributes.optional.forEach(attr => {
    const div = document.createElement('div');
    div.className = 'col-md-6';
    div.innerHTML = `
      <label>${attr.charAt(0).toUpperCase() + attr.slice(1)}: 
        <input type="text" class="form-control" name="${attr}">
      </label>
    `;
    attributesContainer.appendChild(div);
  });

  // Condition (assuming 'type' is the only required field)
  const conditionDiv = document.getElementById('condition-container');
  conditionDiv.innerHTML = `
    <label>Condition: 
      <input type="text" class="form-control" name="condition" required>
    </label>
  `;
}

export async function initItems() {
  await fetchCategoryRules(); // Load rules first

  const categorySelect = document.getElementById('category-select');
  categorySelect.addEventListener('change', (e) => updateFormFields(e.target.value));
  updateFormFields(categorySelect.value); // Initial render

  document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = getFormData(e.target);
    const rules = categoryRules[item.category] || { attributes: { required: [], optional: [] } };
    const allAttributes = [...rules.attributes.required, ...rules.attributes.optional];

    item.attributes = {};
    allAttributes.forEach(attr => {
      if (item[attr]) {
        item.attributes[attr] = item[attr];
        delete item[attr];
      }
    });

    item.condition_history = [{ type: item.condition, date: new Date().toISOString() }];
    item.value = parseFloat(item.value);
    item.cost_price = parseFloat(item.cost_price);
    item.input_vat = parseFloat(item.input_vat) || 0;

    try {
      const data = await apiFetch('/items', { method: 'POST', body: JSON.stringify(item) });
      showAlert('Success', `Added item: ${data.id}`, 'success');
      e.target.reset();
      updateFormFields(categorySelect.value);
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
    const rules = categoryRules[item.category] || { attributes: { required: [], optional: [] } };
    const allAttributes = [...rules.attributes.required, ...rules.attributes.optional];

    item.attributes = {};
    allAttributes.forEach(attr => {
      if (item[attr]) {
        item.attributes[attr] = item[attr];
        delete item[attr];
      }
    });

    item.value = parseFloat(item.value);
    item.cost_price = parseFloat(item.cost_price);
    item.input_vat = parseFloat(item.input_vat) || 0;
    const oldConditionHistory = JSON.parse(e.target.dataset.conditionHistory || '[]');
    item.condition_history = oldConditionHistory;
    const lastCondition = oldConditionHistory.length > 0 ? oldConditionHistory[oldConditionHistory.length - 1].type : null;
    if (item.condition !== lastCondition) {
      item.condition_history.push({ type: item.condition, date: new Date().toISOString() });
    }

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
      const rules = categoryRules[row.category] || { attributes: { required: [], optional: [] } };
      const attrKeys = [...rules.attributes.required, ...rules.attributes.optional];
      const attrDisplay = attrKeys.map(key => `${key}: ${attributes[key] || 'N/A'}`).join(', ');
      const tr = document.createElement('tr');
      tr.dataset.item = JSON.stringify(row);
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.category}</td>
        <td>${row.value.toFixed(2)}</td>
        <td>${row.cost_price.toFixed(2)}</td>
        <td>${attrDisplay}</td>
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
        editItem(row.id, row.name, row.category, row.value, row.cost_price, attributes, row.condition || '', JSON.stringify(conditionHistory), row.input_vat || 0);
      });
    });
  } catch (err) {
    console.error('Items fetch error:', err);
  }
}

function editItem(id, name, category, value, cost_price, attributes, condition, condition_history, input_vat) {
  const form = document.getElementById('edit-item-form');
  form.id.value = id;
  form.name.value = name;
  form.category.value = category;
  form.value.value = value;
  form.cost_price.value = cost_price;
  form.condition.value = condition;
  form.input_vat.value = input_vat;
  form.dataset.conditionHistory = condition_history;

  const rules = categoryRules[category] || { attributes: { required: [], optional: [] } };
  const allAttributes = [...rules.attributes.required, ...rules.attributes.optional];
  allAttributes.forEach(attr => {
    const input = form.querySelector(`input[name="${attr}"]`);
    if (input) input.value = attributes[attr] || '';
  });

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
      showAlert('Success', `Item ${id} has been deleted`, 'success');
      fetchItems();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  }
}