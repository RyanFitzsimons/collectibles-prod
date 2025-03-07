// collectibles-prod/server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const { startBackup } = require('./utils/backup');
const itemRoutes = require('./routes/items');
const transactionRoutes = require('./routes/transactions');
const profitRoutes = require('./routes/profit');
const taxRoutes = require('./routes/tax');
const vatRoutes = require('./routes/vat');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({ storage: multer.memoryStorage() }).single('file'));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/categories', (req, res) => res.json(categoryRules));
app.use('/items', itemRoutes);
app.use('/transactions', transactionRoutes);
app.use(profitRoutes);
app.use(taxRoutes);
app.use(vatRoutes);

// Start backup
startBackup();

app.listen(3000, () => console.log('Server running on port 3000'));