const express = require('express');
const router = express.Router();
const { getTableName } = require('../controllers/configController');
const logger = require('../config/logger');

// Get table name
router.get('/table-name', (req, res, next) => {
  logger.debug('Config route: Received request for table name');
  next();
}, getTableName);

module.exports = router; 