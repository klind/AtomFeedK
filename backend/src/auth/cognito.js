const { CognitoJwtVerifier } = require('aws-jwt-verify');
const fetch = require('node-fetch');
const config = require('../config/env');
const logger = require('../config/logger');

// Initialize Cognito JWT verifier lazily
let verifier = null;
let verifierInitialized = false;

/**
 * Check if Cognito configuration contains placeholders
 * @returns {boolean} - True if using placeholder values
 */
const isUsingPlaceholders = () => {
  return !config.COGNITO_USER_POOL_ID || 
    config.COGNITO_USER_POOL_ID === 'your-user-pool-id' ||
    !config.COGNITO_APP_CLIENT_ID || 
    config.COGNITO_APP_CLIENT_ID === 'your-app-client-id';
};

/**
 * Initialize the Cognito JWT verifier if not already initialized
 */
const initializeVerifier = () => {
  if (verifierInitialized) {
    return;
  }
  
  verifierInitialized = true;
  
  if (!isUsingPlaceholders()) {
    try {
      verifier = CognitoJwtVerifier.create({
        userPoolId: config.COGNITO_USER_POOL_ID,
        tokenUse: 'id', // or 'access'
        clientId: config.COGNITO_APP_CLIENT_ID
      });
      logger.info('Cognito JWT verifier initialized successfully.');
    } catch (err) {
      logger.error('Failed to initialize Cognito JWT verifier:', err.message);
      logger.error('Authentication will not work until this is fixed.');
    }
  }
};

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} - Result of verification with valid flag and payload or error
 */
const verifyToken = async (token) => {
  // Initialize verifier if needed
  initializeVerifier();
  
  // Skip auth check if in development mode and auth is disabled
  if (config.NODE_ENV === 'development' && config.DISABLE_AUTH === 'true') {
    logger.info('Authentication disabled for development. Request allowed.');
    return { valid: true, payload: { sub: 'dev-user' } };
  }
  
  // Skip auth check if using placeholder values (but log a warning)
  if (isUsingPlaceholders()) {
    logger.warn('WARNING: Using placeholder Cognito configuration values. Authentication is effectively disabled.');
    return { valid: true, payload: { sub: 'placeholder-user' } };
  }
  
  // Skip auth check if verifier failed to initialize
  if (!verifier) {
    logger.error('Cognito verifier not initialized. Authentication is effectively disabled.');
    return { valid: true, payload: { sub: 'no-verifier-user' } };
  }

  try {
    const payload = await verifier.verify(token);
    return { valid: true, payload };
  } catch (err) {
    logger.error('Token verification failed:', err);
    return { valid: false, error: 'Invalid token' };
  }
};

/**
 * Authenticate with Cognito using username and password
 * @param {string} username - The username (email)
 * @param {string} password - The password
 * @returns {Promise<Object>} - Authentication result
 */
const authenticateWithCognito = async (username, password) => {
  // Initialize verifier if needed
  initializeVerifier();
  
  // Skip actual authentication in development mode if auth is disabled
  if (config.NODE_ENV === 'development' && config.DISABLE_AUTH === 'true') {
    return { success: true, token: 'dev-token' };
  }
  
  // Log the AWS region for debugging
  logger.debug('Using AWS Region for Cognito:', config.AWS_REGION);
  
  // Authenticate with Cognito
  const response = await fetch(`https://cognito-idp.${config.AWS_REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.COGNITO_APP_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    })
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.AuthenticationResult) {
    throw new Error(data.message || 'Authentication failed');
  }
  
  return { 
    success: true, 
    token: data.AuthenticationResult.IdToken 
  };
};

module.exports = {
  verifyToken,
  authenticateWithCognito,
  get isPlaceholder() {
    return isUsingPlaceholders();
  }
}; 