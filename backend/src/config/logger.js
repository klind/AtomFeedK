const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Determine default log level based on environment
let defaultLogLevel = 'info';
if (process.env.NODE_ENV === 'local') {
  defaultLogLevel = 'debug';
} else if (process.env.NODE_ENV === 'dev') {
  defaultLogLevel = 'info';
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || defaultLogLevel, // Use environment variable if set, otherwise use default for the environment
  format: logFormat,
  defaultMeta: { service: 'atomfeed-api' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
        )
      )
    })
  ]
});

// Add file transports in dev environment
if (process.env.NODE_ENV === 'dev') {
  logger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'error.log'), 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'combined.log') 
  }));
}

// Log the current environment and log level on startup
logger.info(`Logger initialized in ${process.env.NODE_ENV || 'default'} environment with log level: ${logger.level}`);

// Add a method to dynamically change log level
logger.setLogLevel = function(level) {
  logger.level = level;
  logger.info(`Log level changed to: ${level}`);
};

module.exports = logger; 