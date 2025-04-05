const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: Get API information
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 version:
 *                   type: string
 *                 description:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 documentation:
 *                   type: string
 */
router.get('/', (req, res) => {
  // Read package.json for metadata
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
  const appVersion = config.getAppVersion();
  
  res.json({
    name: packageJson.name,
    version: appVersion,
    description: packageJson.description,
    environment: config.NODE_ENV || 'development',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
  });
});

/**
 * @swagger
 * /api/environment:
 *   get:
 *     summary: Get current environment
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Current environment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 NODE_ENV:
 *                   type: string
 */
router.get('/environment', (req, res) => {
  res.json({
    NODE_ENV: config.NODE_ENV
  });
});

module.exports = router; 