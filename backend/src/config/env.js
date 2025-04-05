const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Create a simple logger for this module to avoid circular dependency
const envLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [new winston.transports.Console()]
});

// Flag to track if environment variables have been loaded
let envLoaded = false;

/**
 * Load environment variables based on NODE_ENV
 */
const loadEnv = () => {
  if (process.env.NODE_ENV === 'local') {
    // For local development, use .env file
    require('dotenv').config();
    envLogger.info('Using .env file for local development');
  } else if (process.env.NODE_ENV === 'dev') {
    // For dev environment, use Elastic Beanstalk environment variables
    envLogger.info('Using Elastic Beanstalk environment variables for dev environment');
  } else {
    // For other environments, try environment-specific file first, then fall back to .env
    const envPath = `.env.${process.env.NODE_ENV || 'dev'}`;
    if (fs.existsSync(path.join(__dirname, '../..', envPath))) {
      require('dotenv').config({ path: envPath });
      envLogger.info(`Using environment file: ${envPath}`);
    } else {
      require('dotenv').config();
      envLogger.info(`Environment file ${envPath} not found, using default .env file`);
    }
  }

  envLogger.info(`Running in ${process.env.NODE_ENV || 'default'} mode`);
  envLogger.info(`DynamoDB Table Name: ${process.env.TABLE_NAME}`); 
  envLogger.info(`AWS Region: ${process.env.AWS_REGION}`);
  
  // Mark environment as loaded
  envLoaded = true;
  
  // We can't use the logger here because it would create a circular dependency
  // The logger depends on env.js, and env.js would depend on logger
};

/**
 * Get application version from package.json
 */
const getAppVersion = () => {
  try {
    const packageJson = require('../../package.json');
    return packageJson.version || '1.0.0';
  } catch (error) {
    envLogger.error('Error reading package.json:', error.message);
    return '1.0.0';
  }
};

/**
 * Ensure environment variables are loaded
 */
const ensureEnvLoaded = () => {
  if (!envLoaded) {
    loadEnv();
  }
};

// Export getters for environment variables
module.exports = {
  loadEnv,
  getAppVersion,
  get PORT() {
    ensureEnvLoaded();
    return process.env.PORT || 5000;
  },
  get NODE_ENV() {
    ensureEnvLoaded();
    return process.env.NODE_ENV;
  },
  get TABLE_NAME() {
    ensureEnvLoaded();
    return process.env.TABLE_NAME;
  },
  get AWS_REGION() {
    ensureEnvLoaded();
    return process.env.AWS_REGION;
  },
  get COGNITO_USER_POOL_ID() {
    ensureEnvLoaded();
    return process.env.COGNITO_USER_POOL_ID;
  },
  get COGNITO_APP_CLIENT_ID() {
    ensureEnvLoaded();
    return process.env.COGNITO_APP_CLIENT_ID;
  },
  get DISABLE_AUTH() {
    ensureEnvLoaded();
    return process.env.DISABLE_AUTH;
  }
}; 