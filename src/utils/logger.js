/**
 * Logger Utility
 * 
 * Winston-based structured logging with console and file transports.
 * 
 * @module utils/logger
 */
const winston = require('winston');
const path = require('path');
const config = require('../config/server');

const logDir = path.dirname(
  path.resolve(__dirname, '..', '..', config.logging.file)
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hr-management' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? `\n  ${JSON.stringify(meta, null, 2)}`
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

// Add file transport in non-development environments
if (config.env !== 'development') {
  logger.add(
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

module.exports = logger;
