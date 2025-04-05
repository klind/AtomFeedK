const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const cognitoAuth = require('../middleware/cognitoAuth');

/**
 * @swagger
 * /api/admin/log-level:
 *   post:
 *     summary: Change the application log level
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [level]
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, http, verbose, debug, silly]
 *                 description: The log level to set
 *     responses:
 *       200:
 *         description: Log level changed successfully
 *       400:
 *         description: Invalid log level
 *       401:
 *         description: Unauthorized
 */
router.post('/log-level', cognitoAuth, (req, res) => {
  const { level } = req.body;
  
  // Validate log level
  const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  if (!level || !validLevels.includes(level)) {
    return res.status(400).json({
      message: 'Invalid log level',
      error: `Log level must be one of: ${validLevels.join(', ')}`
    });
  }
  
  // Change log level
  logger.setLogLevel(level);
  
  return res.status(200).json({
    message: `Log level changed to ${level}`
  });
});

/**
 * @swagger
 * /api/admin/log-level:
 *   get:
 *     summary: Get the current application log level
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current log level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 level:
 *                   type: string
 *                   description: The current log level
 *       401:
 *         description: Unauthorized
 */
router.get('/log-level', cognitoAuth, (req, res) => {
  return res.status(200).json({
    level: logger.level
  });
});

module.exports = router; 