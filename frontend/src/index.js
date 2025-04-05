import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Amplify } from 'aws-amplify';
import { AuthProvider } from './hooks/useAuth';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { useTheme } from './hooks/useTheme';
import LoadingState from './components/LoadingState';

// Root component that handles configuration loading
const Root = () => {
  return (
    <React.StrictMode>
      <ConfigProvider>
        <ConfiguredApp />
      </ConfigProvider>
    </React.StrictMode>
  );
};

// Component that uses the config context
const ConfiguredApp = () => {
  const { config, loading, error } = useConfig();
  const { darkMode } = useTheme();

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Show loading state while config is loading
  if (loading) {
    return <LoadingState />;
  }

  // Show error message if config failed to load
  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-red-600 text-xl font-bold">Configuration Error</h1>
        <p className="my-2">{error.message}</p>
        <p className="mb-4">Please check your network connection or contact support.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white px-4 py-2 rounded mt-4 hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Configure Amplify with the loaded config
  if (config && config.cognito) {
    console.log('Configuring Amplify with:', {
      region: config.cognito.region,
      userPoolId: config.cognito.userPoolId,
      appClientId: config.cognito.appClientId
    });
    
    Amplify.configure({
      Auth: {
        Cognito: {
          region: config.cognito.region,
          userPoolId: config.cognito.userPoolId,
          userPoolClientId: config.cognito.appClientId,
        }
      }
    });
  } else {
    console.warn('Cognito configuration missing');
  }

  // Only render app components when config is loaded
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
