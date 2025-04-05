import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchRecordsByPersonId } from '../services/api';
import AutoUpdateToggle from './AutoUpdateToggle';

const SearchBar = forwardRef(({ 
  onSearchResults, 
  onResetSearch, 
  recordsPerPage, 
  onRecordsPerPageChange,
  autoUpdate = false,
  onAutoUpdateToggle,
  lastUpdated,
  isRefetching = false,
  onManualRefresh
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    resetSearchInput: () => {
      setSearchTerm('');
      setError('');
    }
  }));

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      onResetSearch();
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const response = await searchRecordsByPersonId(searchTerm.trim());
      console.log('🔍 [SearchBar] Search complete:', {
        term: searchTerm.trim(),
        matches: response.data?.length || 0
      });
      
      // Pass the person ID to the parent component instead of the full response
      if (response.data && response.data.length > 0) {
        // Get the PersonId from the first result
        const personId = response.data[0].PersonId;
        onSearchResults({
          personId,
          data: response.data
        });
      } else {
        // Handle no results case
        setError('No records found for this Person ID');
        onSearchResults(null);
      }
    } catch (err) {
      console.error('❌ [SearchBar] Search error:', err.message);
      setError(err.message);
      onSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setError('');
    onResetSearch();
  };

  return (
    <div className="w-full">
      {/* Single row layout with search, auto-update, and records per page */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-1 mt-2">
        {/* Search input on the left */}
        <div className="relative min-w-[300px] mb-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by Person ID..."
            className="w-full h-10 px-4 py-2 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isSearching}
            aria-label="Search by Person ID"
          />
          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
            {searchTerm && (
              <button
                onClick={handleClear}
                className="mr-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isSearching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Controls on the right */}
        <div className="flex items-center flex-wrap gap-4 mb-2">
          {/* Auto-update toggle */}
          <AutoUpdateToggle 
            enabled={autoUpdate}
            onToggle={onAutoUpdateToggle}
            lastUpdated={lastUpdated}
            isRefetching={isRefetching}
            onManualRefresh={onManualRefresh}
          />
          
          {/* Records per page selector */}
          <div className="flex items-center">
            <label htmlFor="recordsPerPage" className="mr-2 text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap">
              Records per page:
            </label>
            <select
              id="recordsPerPage"
              value={recordsPerPage}
              onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
              className="h-8 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1 text-sm"
            >
              {[10, 25, 50, 200].map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="w-full mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default SearchBar; 