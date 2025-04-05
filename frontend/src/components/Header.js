import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../contexts/ConfigContext';
import { getTableName } from '../services/api';

const Header = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { isAuthenticated, signOut } = useAuth();
  const { config } = useConfig();
  const [tableName, setTableName] = useState(null);
  const [setError] = useState(null);

  useEffect(() => {
    const fetchTableName = async () => {
      try {
        const result = await getTableName();
        setTableName(result.tableName);
      } catch (err) {
        console.error('Error fetching table name:', err);
        setError(err.message);
      }
    };

    fetchTableName();
  }, []);

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md relative z-10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            HCM Atom Feed
          </h1>

          <div className="flex items-center mx-4">
            <span className="text-gray-700 dark:text-gray-300">Env:</span>
            <span id="environment" className="mx-2 text-gray-900 dark:text-white">
              {config ? (config.environment || 'Unknown') : '...'}
            </span>
            {tableName && (
              <>
                <span className="text-gray-700 dark:text-gray-300 ml-4">Table:</span>
                <span className="mx-2 text-gray-900 dark:text-white">
                  {tableName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={handleToggle}
              className="relative inline-flex h-8 w-16 items-center rounded-full border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Toggle dark mode"
              type="button"
            >
              <span className={`${darkMode ? 'translate-x-9' : 'translate-x-1'} inline-flex h-6 w-6 transform items-center justify-center rounded-full transition-transform duration-200 ease-in-out ${darkMode ? 'bg-indigo-600' : 'bg-white shadow-sm'}`}>
                {darkMode ? (
                  <SunIcon className="h-4 w-4 text-white" />
                ) : (
                  <MoonIcon className="h-4 w-4 text-gray-700" />
                )}
              </span>
            </button>
            
            {isAuthenticated && (
              <button
                onClick={signOut}
                className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 