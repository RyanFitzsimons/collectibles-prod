// collectibles-prod/server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const { startBackup } = require('./utils/backup');
const { validationRules } = require('./utils/inventory');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({ storage: multer.memoryStorage() }).single('file'));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/categories', (req, res) => {
  console.log('GET /categories - validationRules:', validationRules); // Debug
  if (!validationRules) {
    console.error('validationRules is undefined');
    return res.status(500).json({ error: 'Category rules not available' });
  }
  res.json(validationRules);
});

const itemRoutes = require('./routes/items');
const transactionRoutes = require('./routes/transactions');
const profitRoutes = require('./routes/profit');
const taxRoutes = require('./routes/tax');
const vatRoutes = require('./routes/vat');

app.use('/items', itemRoutes);
app.use('/transactions', transactionRoutes);
app.use(profitRoutes);
app.use(taxRoutes);
app.use(vatRoutes);

startBackup();

app.listen(3000, () => console.log('Server running on port 3000'));