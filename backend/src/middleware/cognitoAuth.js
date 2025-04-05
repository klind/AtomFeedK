const { CognitoJwtVerifier } = require('aws-jwt-verify');
const logger = require('../config/logger');

// Check if we have real Cognito configuration or just placeholders
const isPlaceholder = 
  !process.env.COGNITO_USER_POOL_ID || 
  process.env.COGNITO_USER_POOL_ID === 'your-user-pool-id' ||
  !process.env.COGNITO_APP_CLIENT_ID || 
  process.env.COGNITO_APP_CLIENT_ID === 'your-app-client-id';

// Initialize the JWT verifier with Cognito User Pool details
let verifier = null;
if (!isPlaceholder) {
  try {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'id', // or 'access'
      clientId: process.env.COGNITO_APP_CLIENT_ID
    });
    logger.info('Cognito JWT verifier initialized successfully.');
  } catch (err) {
    logger.error('Failed to initialize Cognito JWT verifier:', err.message);
    logger.error('Authentication will not work until this is fixed.');
  }
}

/**
 * Middleware to verify Cognito JWT tokens
 */
const cognitoAuth = async (req, res, next) => {
  // Skip auth check if in development mode and auth is disabled
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    logger.info('Authentication disabled for development. Request allowed.');
    return next();
  }
  
  // Skip auth check if using placeholder values (but log a warning)
  if (isPlaceholder) {
    logger.warn('WARNING: Using placeholder Cognito configuration values. Authentication is effectively disabled.');
    logger.warn('Please update your environment variables with real Cognito User Pool and Client IDs.');
    return next();
  }
  
  // Skip auth check if verifier failed to initialize
  if (!verifier) {
    logger.error('Cognito verifier not initialized. Authentication is effectively disabled.');
    return next();
  }

  try {
    let token;
    
    // First check the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // If no Authorization header, check for token in cookies (for Swagger UI)
    else if (req.cookies && req.cookies.swagger_token) {
      token = req.cookies.swagger_token;
      
      // Add the token to the Authorization header for downstream middleware/routes
      req.headers.authorization = `Bearer ${token}`;
    }
    
    // If no token found in either place, return unauthorized
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    // Verify the token
    const payload = await verifier.verify(token);
    
    // Add the user info to the request
    req.user = payload;
    
    next();
  } catch (err) {
    logger.error('Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = cognitoAuth; 