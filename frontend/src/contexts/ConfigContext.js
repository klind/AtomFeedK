import React, { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { loadConfig } from '../utils/config';

// Create the context
const ConfigContext = createContext(null);

// Provider component that will wrap your app
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        // Load the configuration
        console.log('Loading configuration...');
        const configResult = await loadConfig();
        
        // Set the configuration in state - we get the full config object now
        setConfig(configResult);
        
        console.log(`Configuration loaded. Environment: ${configResult.environment}, API URL: ${configResult.apiUrl}`);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load configuration:', err);
        setError(err);
        setLoading(false);
      }
    };

    initializeConfig();
  }, []);

  // Log when config changes
  useEffect(() => {
    if (config) {
      console.log('Config context updated:', config);
    }
  }, [config]);

  const contextValue = {
    config,
    loading,
    error,
    // Add a refresh method in case we need to reload the config
    refreshConfig: async () => {
      setLoading(true);
      try {
        const refreshedConfig = await loadConfig();
        setConfig(refreshedConfig);
        setLoading(false);
      } catch (err) {
        console.error('Failed to refresh configuration:', err);
        setError(err);
        setLoading(false);
      }
    }
  };

  // Provide the config values and loading state
  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

ConfigProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Custom hook for easy access to the config context
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}; 