// collectibles-prod/utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../logs', 'combined.log') }),
    new winston.transports.Console()
  ]
});

module.exports = logger;