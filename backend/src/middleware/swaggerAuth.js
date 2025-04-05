const path = require('path');
const { verifyToken } = require('../auth/cognito');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Custom middleware for Swagger UI authentication
 */
const swaggerAuthMiddleware = async (req, res, next) => {
  // Skip auth check if in development mode and auth is disabled
  if (config.NODE_ENV === 'local' && config.DISABLE_AUTH === 'true') {
    logger.info('Authentication disabled for local. Request allowed.');
    // Set a dummy token in cookie for Swagger UI to use
    res.cookie('swagger_token', 'dev-token', { 
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    return next();
  }
  
  // Check if token is in cookie
  const token = req.cookies?.swagger_token;
  
  if (token) {
    const result = await verifyToken(token);
    if (result.valid) {
      // Token is valid, proceed to Swagger UI
      req.user = result.payload;
      
      // Ensure the token is still in the cookie (refresh expiry)
      res.cookie('swagger_token', token, { 
        httpOnly: true,
        maxAge: 3600000 // 1 hour
      });
      
      return next();
    }
    // Invalid token, clear cookie
    res.clearCookie('swagger_token');
  }
  
  // Check if token is in Authorization header (for API requests from Swagger UI)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.split(' ')[1];
    const result = await verifyToken(headerToken);
    
    if (result.valid) {
      // Token from header is valid, set it in cookie and proceed
      req.user = result.payload;
      
      res.cookie('swagger_token', headerToken, { 
        httpOnly: true,
        maxAge: 3600000 // 1 hour
      });
      
      return next();
    }
  }
  
  // No valid token, serve login page instead of Swagger UI
  res.sendFile(path.join(__dirname, '../public', 'swagger-login.html'));
};

module.exports = swaggerAuthMiddleware; 