// collectibles-prod/server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const { startBackup } = require('./utils/backup');
const { validationRules } = require('./utils/inventory');

let itemRoutes;
try {
  itemRoutes = require('./routes/items');
  console.log('itemRoutes loaded:', itemRoutes !== undefined);
  console.log('itemRoutes type:', typeof itemRoutes, itemRoutes instanceof express.Router);
} catch (err) {
  console.error('Failed to load itemRoutes:', err);
}

const transactionRoutes = require('./routes/transactions');
const profitRoutes = require('./routes/profit');
const taxRoutes = require('./routes/tax');
const vatRoutes = require('./routes/vat');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/categories', (req, res) => {
  console.log('GET /categories - validationRules:', validationRules);
  if (!validationRules) {
    console.error('validationRules is undefined');
    return res.status(500).json({ error: 'Validation rules not available' });
  }
  res.json(validationRules);
});

if (itemRoutes && itemRoutes instanceof express.Router) {
  app.use('/items', itemRoutes);
  console.log('Registered /items routes');
} else {
  console.error('itemRoutes invalid or not a router:', itemRoutes);
}

const upload = multer({ storage: multer.memoryStorage() });
app.use('/items/bulk', upload.single('file'), itemRoutes || ((req, res) => res.status(500).json({ error: 'Items routes not loaded' })));

app.use('/transactions', transactionRoutes);
app.use(profitRoutes);
app.use(taxRoutes);
app.use(vatRoutes);

startBackup();

app.listen(3000, () => console.log('Server running on port 3000'));