import React, { useState, useRef } from 'react';
import './App.css'; // Import our custom CSS
import Header from './components/Header';
import RecordForm from './components/RecordForm';
import RecordTable from './components/RecordTable';
import SearchBar from './components/SearchBar';
import Pagination from './components/Pagination';
import { batchDeleteRecords } from './services/api';
import AuthWrapper from './components/AuthWrapper';
import QueryProvider from './contexts/QueryProvider';
import useRecords from './hooks/useRecords';

// Actual App component that uses the hooks
function AppContent() {
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [previousTokens, setPreviousTokens] = useState([]);
  const [searchPersonId, setSearchPersonId] = useState(null);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    statusFilter: 'all',
    workerFilter: 'all',
    feedFilter: 'all',
    operationFilter: 'all'
  });
  const [selectedRecords, setSelectedRecords] = useState([]);
  const recordFormRef = useRef(null);
  const searchBarRef = useRef(null);

  // Use the custom hook for fetching records
  const {
    data,
    error,
    isLoading,
    isRefetching,
    isFetching,
    refetch,
    clearSearch,
    dataUpdatedAt,
  } = useRecords({
    limit: recordsPerPage,
    nextToken: previousTokens[previousTokens.length - 1],
    filters: activeFilters,
    personId: searchPersonId,
    autoUpdate,
    autoUpdateInterval: 2000,
  });

  // Extract records and nextToken from the query response
  const records = data?.items || [];
  const nextToken = data?.nextToken;

  const handleSearchResults = (results) => {
    if (results && results.personId) {
      // Set the personId from the search results
      setSearchPersonId(results.personId);
      
      // Reset pagination when showing search results
      setPreviousTokens([]);
      setCurrentPage(1);
    } else {
      // If no results or results is null, clear search
      setSearchPersonId(null);
    }
  };

  const handleClearSearch = () => {
    setSearchPersonId(null);
    clearSearch();
    
    // Reset the search input field if the ref is available
    if (searchBarRef.current) {
      searchBarRef.current.resetSearchInput();
    }
  };

  const handleRecordAdded = () => {
    // Refresh records after adding a new one
    refetch();
  };

  const handleRecordDeleted = () => {
    // Refresh records after deleting one
    refetch();
  };

  const handleBatchDelete = async (records) => {
    try {
      await batchDeleteRecords(records);
      // Clear selected records first
      setSelectedRecords([]);
      
      // Only check if we need to clear search if we're in search mode
      if (searchPersonId) {
        // Refresh records after deletion and get the result
        const result = await refetch();
        
        // Check if there are no records returned
        if (!result.data || !result.data.items || result.data.items.length === 0) {
          console.log("No records found after deletion, clearing search");
          handleClearSearch();
        }
      } else {
        // Not in search mode, just refetch
        refetch();
      }
      
    } catch (err) {
      console.error('Error in batch delete:', err);
    }
  };

  const handleNextPage = () => {
    if (nextToken) {
      setPreviousTokens([...previousTokens, nextToken]);
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (previousTokens.length > 0) {
      const newPreviousTokens = [...previousTokens];
      newPreviousTokens.pop();
      setPreviousTokens(newPreviousTokens);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleRecordsPerPageChange = (newLimit) => {
    // Update records per page
    setRecordsPerPage(newLimit);
    
    // Reset pagination
    setPreviousTokens([]);
    setCurrentPage(1);
  };

  const handleSelectRecords = (records) => {
    setSelectedRecords(records);
  };

  const handleFiltersChange = (filters) => {
    // Update filters in state
    setActiveFilters(filters);
    
    // Reset pagination when filters change
    setPreviousTokens([]);
    setCurrentPage(1);
  };

  const handleAutoUpdateToggle = (enabled) => {
    setAutoUpdate(enabled);
    
    // If auto-update is being turned on, reset to the first page
    if (enabled) {
      // Reset pagination state
      setPreviousTokens([]);
      setCurrentPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header />
      
      <main className="flex justify-center px-2 mt-2 relative z-0 mx-auto">
        <div className="w-full max-w-[90%] lg:max-w-[80%]">
          {error && (
            <div className="p-4 rounded bg-red-100 dark:bg-red-900 mb-4">
              <h3 className="text-red-600 dark:text-red-300">
                Error
              </h3>
              <div className="mt-4 text-gray-900 dark:text-white">
                {error.message}
              </div>
            </div>
          )}
          
          <RecordForm ref={recordFormRef} onRecordAdded={handleRecordAdded} />
          
          <div>
            <SearchBar 
              ref={searchBarRef}
              onSearchResults={handleSearchResults}
              onResetSearch={handleClearSearch}
              recordsPerPage={recordsPerPage}
              onRecordsPerPageChange={handleRecordsPerPageChange}
              autoUpdate={autoUpdate}
              onAutoUpdateToggle={handleAutoUpdateToggle}
              lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
              isRefetching={isRefetching}
              onManualRefresh={refetch}
            />
          </div>

          {isLoading ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            </div>
          ) : (
            <>
              {/* Show filters when not in search results mode */}
              {!searchPersonId && (
                <div className="mb-2">
                  <RecordTable.Filters 
                    records={records}
                    onFiltersChange={handleFiltersChange}
                    activeFilters={activeFilters}
                  />
                </div>
              )}
              
              {(
                <Pagination 
                  nextToken={nextToken}
                  onPrevious={previousTokens.length > 0 ? handlePreviousPage : null}
                  onNext={nextToken ? handleNextPage : null}
                  hasMore={!!nextToken}
                  selectedRecords={selectedRecords}
                  onDeleteSelected={() => handleBatchDelete(selectedRecords)}
                  isLoading={isFetching}
                  autoUpdate={autoUpdate}
                />
              )}
              
              <RecordTable
                records={records}
                onRecordDeleted={handleRecordDeleted}
                onBatchDelete={handleBatchDelete}
                onClearSearch={handleClearSearch}
                onSelectRecords={handleSelectRecords}
                isLoading={isFetching}
                activeFilters={activeFilters}
              />
              
              {(
                <Pagination 
                  nextToken={nextToken}
                  onPrevious={previousTokens.length > 0 ? handlePreviousPage : null}
                  onNext={nextToken ? handleNextPage : null}
                  hasMore={!!nextToken}
                  selectedRecords={selectedRecords}
                  onDeleteSelected={() => handleBatchDelete(selectedRecords)}
                  isLoading={isFetching}
                  autoUpdate={autoUpdate}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Wrapper function for the entire app
function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <AuthWrapper>
        <QueryProvider>
          <AppContent />
        </QueryProvider>
      </AuthWrapper>
    </div>
  );
}

export default App;
