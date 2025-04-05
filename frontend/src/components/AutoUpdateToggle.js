import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Auto-update toggle component
 * Provides a UI for enabling/disabling auto-updates and shows last update time
 * @param {Object} props - Component props
 * @param {boolean} props.enabled - Whether auto-update is currently enabled
 * @param {function} props.onToggle - Callback when auto-update toggle changes
 * @param {Date} props.lastUpdated - When the data was last updated
 * @param {boolean} props.isRefetching - Whether data is currently being refetched
 * @param {function} props.onManualRefresh - Callback to manually refresh data
 */
const AutoUpdateToggle = ({ 
  enabled = false, 
  onToggle, 
  lastUpdated,
  isRefetching = false,
  onManualRefresh
}) => {
  const [localTime, setLocalTime] = useState('');

  // Update the local time display every second
  useEffect(() => {
    if (!lastUpdated) return;
    
    const updateTime = () => {
      setLocalTime(new Date(lastUpdated).toLocaleTimeString());
    };
    
    // Update immediately
    updateTime();
    
    // Then update every second
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!enabled);
    }
  };

  return (
    <div className="flex items-center h-10">
      {/* Toggle switch */}
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={enabled}
            onChange={handleToggle}
          />
          <div className={`block w-10 h-6 rounded-full ${enabled ? 'bg-indigo-600' : 'bg-gray-400'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${enabled ? 'transform translate-x-4' : ''}`}></div>
        </div>
        <div className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto-update
        </div>
      </label>
      
      {/* Manual refresh button and timestamp */}
      <div className="flex items-center ml-2">
        <button 
          onClick={onManualRefresh}
          disabled={isRefetching}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh now"
        >
          <ArrowPathIcon 
            className={`h-5 w-5 text-indigo-600 dark:text-indigo-400 ${isRefetching ? 'animate-spin' : ''}`} 
          />
        </button>
        
        {lastUpdated && (
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {localTime}
          </span>
        )}
      </div>
    </div>
  );
};

AutoUpdateToggle.propTypes = {
  enabled: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  lastUpdated: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  isRefetching: PropTypes.bool,
  onManualRefresh: PropTypes.func
};

export default AutoUpdateToggle; 