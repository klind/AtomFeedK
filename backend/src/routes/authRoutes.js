const express = require('express');
const router = express.Router();
const { verifyToken, authenticateWithCognito } = require('../auth/cognito');
const { validateEmailMiddleware } = require('../middleware/emailValidation');
const logger = require('../config/logger');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with Cognito credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication failed
 */
router.post('/login', validateEmailMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
      const result = await authenticateWithCognito(username, password);
      
      // Set token in cookie
      res.cookie('swagger_token', result.token, { 
        httpOnly: true,
        maxAge: 3600000 // 1 hour
      });
      
      res.json({ success: true });
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * @swagger
 * /api/auth/verify-token:
 *   post:
 *     summary: Verify a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Token is required
 *       401:
 *         description: Invalid token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const result = await verifyToken(token);
    
    if (!result.valid) {
      return res.status(401).json({ error: result.error || 'Invalid token' });
    }
    
    // Set token in cookie
    res.cookie('swagger_token', token, { 
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and clear authentication
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Successfully logged out
 */
router.post('/logout', (req, res) => {
  // Clear the swagger token cookie
  res.clearCookie('swagger_token');
  res.json({ success: true, message: 'Successfully logged out' });
});

module.exports = router; 