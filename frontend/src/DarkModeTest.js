import React, { useState } from 'react';

const DarkModeTest = () => {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="p-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Dark Mode Test</h1>
      <button 
        onClick={toggleDarkMode}
        className={`px-5 py-2 rounded ${isDark ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'}`}
      >
        Toggle Dark Mode: {isDark ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};

export default DarkModeTest; 