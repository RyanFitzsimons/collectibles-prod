// collectibles-prod/utils/backup.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

function backupDatabase() {
  const source = path.join(__dirname, '../data', 'collectibles.db');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(backupsDir, `collectibles-${timestamp}.db`);
  fs.copyFile(source, destination, (err) => {
    if (err) console.error('Backup failed:', err);
    else console.log(`Backup created: ${destination}`);
  });
}

function startBackup() {
  cron.schedule('0 0 * * *', backupDatabase); // Daily at midnight
  backupDatabase(); // Initial backup
}

module.exports = { startBackup };