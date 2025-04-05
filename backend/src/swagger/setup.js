const fs = require('fs');
const path = require('path');
const { getSwaggerLoginHtml } = require('./templates/loginPage');
const logger = require('../config/logger');

/**
 * Setup Swagger UI and related files
 * @param {Object} app - Express app instance
 */
const setupSwagger = (app) => {
  logger.debug('[Swagger] Setting up Swagger UI and related files');
  
  // Create public directory for static files if it doesn't exist
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    logger.debug('[Swagger] Creating public directory for static files');
    fs.mkdirSync(publicDir);
  }

  // Copy SWAGGER_AUTH.md to public directory if it exists
  const swaggerAuthMdPath = path.join(__dirname, '../../SWAGGER_AUTH.md');
  if (fs.existsSync(swaggerAuthMdPath)) {
    logger.debug('[Swagger] Copying SWAGGER_AUTH.md to public directory');
    fs.copyFileSync(swaggerAuthMdPath, path.join(publicDir, 'SWAGGER_AUTH.md'));
  }

  // Create the login page HTML file
  logger.debug('[Swagger] Creating swagger-login.html file');
  const swaggerLoginHtml = getSwaggerLoginHtml();
  fs.writeFileSync(path.join(publicDir, 'swagger-login.html'), swaggerLoginHtml);
  
  logger.info('[Swagger] Swagger UI setup completed');
};

module.exports = {
  setupSwagger
};