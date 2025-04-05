import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

const Pagination = ({ 
  nextToken, 
  onPrevious, 
  onNext, 
  hasMore,
  selectedRecords = [],
  onDeleteSelected = null,
  isLoading = false,
  autoUpdate = false
}) => {
  
  return (
    <div className={`mt-2 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border-2 dark:border-gray-700 ${isLoading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-3">
        {/* Left column - delete selected button */}
        <div className="col-span-1 flex items-center">
          {selectedRecords.length > 0 && onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete Selected ({selectedRecords.length})</span>
            </button>
          )}
        </div>
        
        {/* Middle column - pagination buttons */}
        <div className="col-span-1 flex justify-center items-center">
          <button
            onClick={onPrevious}
            disabled={!onPrevious || isLoading || autoUpdate}
            className="w-20 flex justify-center px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded mr-2 transition-colors disabled:opacity-50"
            aria-label="Previous page"
            title={autoUpdate ? "Pagination is disabled during auto-update" : "Previous page"}
          >
            &lt;&lt;
          </button>
          <button
            onClick={onNext}
            disabled={!hasMore || isLoading || autoUpdate}
            className="w-20 flex justify-center px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50"
            aria-label="Next page"
            title={autoUpdate ? "Pagination is disabled during auto-update" : "Next page"}
          >
            &gt;&gt;
          </button>
        </div>
        
        {/* Right column - empty */}
        <div className="col-span-1"></div>
      </div>
    </div>
  );
};

export default Pagination; 