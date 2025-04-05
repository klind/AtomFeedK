// Remove the import from api.js to break the circular dependency
// import { getEnvironment } from '../services/api';

/**
 * Configuration utility to load environment variables at runtime from config.json
 * This allows us to deploy the same build to different environments
 */

// Cache for the loaded configuration
let loadedConfig = null;

/**
 * Loads the configuration from environment variables or config.json
 * @returns {Promise<Object>} The configuration object
 */
export const loadConfig = async () => {
  // Return cached config if already loaded
  if (loadedConfig) {
    return loadedConfig;
  }

  try {
    // Get environment from ENVIRONMENT variable only
    const environment = process.env.REACT_APP_ENVIRONMENT;
    
    // Remove the call to getEnvironment() which creates the circular dependency
    // const data = await getEnvironment(); 

    console.log(`Detected frontend environment: ${environment}`);
    
    if (environment === 'local') {
      // In local environment, use environment variables from .env.local
      console.log('Loading config from environment variables');
      
      // Create config from environment variables
      const envConfig = {
        apiUrl: process.env.REACT_APP_API_URL,
        environment: environment,
        cognito: {
          region: process.env.REACT_APP_COGNITO_REGION,
          userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
          appClientId: process.env.REACT_APP_COGNITO_APP_CLIENT_ID
        }
      };
      
      // Log the config for debugging
      console.log('Environment config:', {
        apiUrl: envConfig.apiUrl,
        environment: envConfig.environment,
        cognito: {
          region: envConfig.cognito.region,
          userPoolId: envConfig.cognito.userPoolId,
          appClientId: envConfig.cognito.appClientId
        }
      });
      
      // Validate that we have the required values
      if (!envConfig.cognito.appClientId || envConfig.cognito.appClientId === 'undefined') {
        throw new Error('Missing required configuration: REACT_APP_COGNITO_APP_CLIENT_ID');
      }
      
      loadedConfig = envConfig;
      return loadedConfig;
    } else if (environment === 'dev') {
      // In dev environment, use CloudFront-served config
      console.log(`Loading config from CloudFront for ${environment} environment`);
      const configUrl = `/config/config.json`;
      console.log(`Fetching config from: ${configUrl}`);
      const response = await fetch(configUrl);
      
      if (!response.ok) {
        console.warn(`Failed to load config from ${configUrl} - Status: ${response.status}`);
        
        // Log the actual response content for debugging
        const responseText = await response.text();
        console.error(`Response content: ${responseText.substring(0, 200)}...`);
        
        throw new Error(`Failed to load config from ${configUrl} - Status: ${response.status}`);
      }

      try {
        const responseText = await response.text();
        
        // Debug log to see what we're trying to parse
        console.log(`Received config (first 100 chars): ${responseText.substring(0, 100)}...`);
        
        // Try to parse the JSON
        const config = JSON.parse(responseText);
        // Add environment to the config
        config.environment = environment;
        loadedConfig = config;
        return loadedConfig;
      } catch (parseError) {
        console.error('Error parsing JSON config:', parseError);
        throw new Error(`Failed to parse config JSON: ${parseError.message}`);
      }
    } else {
      // Default fallback config for production or other environments
      console.log(`Using default config for environment: ${environment}`);
      const defaultConfig = {
        apiUrl: process.env.REACT_APP_API_URL || window.location.origin,
        environment: environment || 'production',
        cognito: {
          region: process.env.REACT_APP_COGNITO_REGION,
          userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
          appClientId: process.env.REACT_APP_COGNITO_APP_CLIENT_ID
        }
      };
      
      loadedConfig = defaultConfig;
      return loadedConfig;
    }
  } catch (error) {
    console.error('Error loading config:', error);
    throw error; // Make sure to throw the error so it's caught by the caller
  }
};

/**
 * Gets the current configuration
 * @returns {Object} The configuration object or null if not loaded
 * @throws {Error} If configuration hasn't been loaded yet
 */
export const getConfig = () => {
  if (!loadedConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return loadedConfig;
};

/**
 * Gets a specific configuration value
 * @param {string} key - The configuration key to get
 * @returns {any} The configuration value
 * @throws {Error} If configuration hasn't been loaded yet
 */
export const getConfigValue = (key) => {
  if (!loadedConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), loadedConfig);
};

export default {
  loadConfig,
  getConfig,
  getConfigValue
}; 