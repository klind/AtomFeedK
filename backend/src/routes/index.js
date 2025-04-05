const express = require('express');
const fs = require('fs');
const path = require('path');
const recordRoutes = require('./recordRoutes');
const authRoutes = require('./authRoutes');
const infoRoutes = require('./infoRoutes');
const adminRoutes = require('./adminRoutes');
const configRoutes = require('./configRoutes');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Setup all application routes
 * @param {Object} app - Express app instance
 */
const setupRoutes = (app) => {
  // API routes
  app.use('/api/records', recordRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/info', infoRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/config', configRoutes);
  
  // Add a direct route for /api/environment that returns the same data as /api/info/environment
  app.get('/api/environment', (req, res) => {
    res.json({
      NODE_ENV: config.NODE_ENV
    });
  });
  
  // Debug route to catch all requests
  app.use((req, res, next) => {
    logger.debug(`Received request: ${req.method} ${req.url}`);
    next();
  });
  
  // Serve static HTML file for root route
  app.get('/', (req, res) => {
    // Read the HTML file
    let htmlContent = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    
    // Replace the version placeholder with the actual version from package.json
    const appVersion = config.getAppVersion();
    htmlContent = htmlContent.replace('Version: 1.0.0', `Version: ${appVersion}`);
    
    // Replace the NODE_ENV placeholder
    htmlContent = htmlContent.replace('<!-- NODE_ENV -->', config.NODE_ENV);
    
    // Set the content type and send the HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      message: 'Something went wrong!',
      error: err.message,
    });
  });
};

module.exports = {
  setupRoutes
}; 