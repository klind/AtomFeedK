import React from 'react';

const LoadingState = ({ message = 'Loading application configuration...' }) => (
  <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-lg text-gray-900 dark:text-white">{message}</p>
    </div>
  </div>
);

export default LoadingState; 