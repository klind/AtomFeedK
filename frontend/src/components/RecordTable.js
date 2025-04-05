import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrashIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { deleteRecord, updateRecordProcessedStatus } from '../services/api';
import PropTypes from 'prop-types';
import { FEED_OPTIONS, OPERATION_OPTIONS, STATUS_OPTIONS, WORKER_OPTIONS } from '../utils/filterConfig';

// Filters component
const TableFilters = ({ records = [], onFiltersChange, activeFilters }) => {
  // Get initial filter values from activeFilters prop
  const [filters, setFilters] = useState({
    statusFilter: activeFilters?.statusFilter || 'all',
    workerFilter: activeFilters?.workerFilter || 'all',
    feedFilter: activeFilters?.feedFilter || 'all',
    operationFilter: activeFilters?.operationFilter || 'all'
  });

  // Update local state when activeFilters prop changes
  useEffect(() => {
    if (activeFilters) {
      setFilters(activeFilters);
    }
  }, [activeFilters]);
  
  const handleFilterChange = (filterType, value) => {
    // Update local state
    const updatedFilters = {
      ...filters,
      [filterType]: value
    };
    
    setFilters(updatedFilters);
    
    // Notify parent component of filter changes
    onFiltersChange?.(updatedFilters);
  };

  const handleResetFilters = () => {
    // Reset all filters to 'all'
    const resetFilters = {
      statusFilter: 'all',
      workerFilter: 'all',
      feedFilter: 'all',
      operationFilter: 'all'
    };
    
    // Update local state
    setFilters(resetFilters);
    
    // Immediately notify parent with reset values
    onFiltersChange?.(resetFilters);
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center items-center w-full">
      <div className="flex flex-wrap gap-4 justify-center items-center">
        <select
          value={filters.feedFilter}
          onChange={(e) => handleFilterChange('feedFilter', e.target.value)}
          className="block w-40 px-3 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Feeds</option>
          {FEED_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={filters.operationFilter}
          onChange={(e) => handleFilterChange('operationFilter', e.target.value)}
          className="block w-40 px-3 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Operations</option>
          {OPERATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={filters.statusFilter}
          onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
          className="block w-40 px-3 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={filters.workerFilter}
          onChange={(e) => handleFilterChange('workerFilter', e.target.value)}
          className="block w-40 px-3 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Workers</option>
          {WORKER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <button
          onClick={handleResetFilters}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

TableFilters.propTypes = {
  records: PropTypes.arrayOf(PropTypes.object),
  onFiltersChange: PropTypes.func,
  activeFilters: PropTypes.shape({
    statusFilter: PropTypes.string,
    workerFilter: PropTypes.string,
    feedFilter: PropTypes.string,
    operationFilter: PropTypes.string
  })
};

const RecordTable = ({
  records,
  onRecordDeleted,
  onBatchDelete,
  onClearSearch = () => {},
  onSelectRecords = () => {},
  isLoading = false,
  activeFilters = {
    statusFilter: 'all',
    workerFilter: 'all',
    feedFilter: 'all',
    operationFilter: 'all'
  }
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [processingRecord, setProcessingRecord] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState(null);
  const [infoRecord, setInfoRecord] = useState(null);

  useEffect(() => {
    console.log("selectedRecords updated:", selectedRecords);
    onSelectRecords(selectedRecords);
  }, [selectedRecords, onSelectRecords]);

  // Reset selected records when records change (e.g., after refetch)
  useEffect(() => {
    setSelectedRecords([]);
  }, [records]);

  // Filter records based on active filters
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];

    // With the React Query implementation, records are already filtered by the API
    // Just sort by PublishedDateTime in descending order
    const sorted = [...records].sort((a, b) => {
      const dateA = new Date(a.PublishedDateTime);
      const dateB = new Date(b.PublishedDateTime);
      return dateB - dateA;
    });
    return sorted;
  }, [records]);

  const handleDeleteClick = (record) => {
    setConfirmDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    
    setLoading(true);
    setError(null);

    try {
      await deleteRecord(confirmDelete.PersonId, confirmDelete.EntryId);
      if (onRecordDeleted) {
        onRecordDeleted();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const handleConfirmBatchDelete = () => {
    if (selectedRecords.length > 0 && onBatchDelete) {
      onBatchDelete(selectedRecords);
      setSelectedRecords([]);
      setConfirmBatchDelete(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const handleCancelBatchDelete = () => {
    setConfirmBatchDelete(false);
  };

  const handleSelectRecord = (record) => {
    setSelectedRecords((prev) => {
      const isSelected = prev.some(
        (r) => r.PersonId === record.PersonId && r.EntryId === record.EntryId
      );

      if (isSelected) {
        return prev.filter(
          (r) => !(r.PersonId === record.PersonId && r.EntryId === record.EntryId)
        );
      } else {
        return [...prev, { PersonId: record.PersonId, EntryId: record.EntryId }];
      }
    });
  };

  const isSelected = (record) => {
    return selectedRecords.some(
      (r) => r.PersonId === record.PersonId && r.EntryId === record.EntryId
    );
  };

  // Get all field names from the records except ConstantKey, EntryId, and CorrelationEntryId
  const getFieldNames = () => {
    if (!records || records.length === 0) return [];

    const allFields = new Set();
    records.forEach(record => {
      Object.keys(record).forEach(key => {
        // Exclude ConstantKey, EntryId, and CorrelationEntryId fields
        if (key !== 'ConstantKey' && key !== 'EntryId' && key !== 'CorrelationEntryId' && key !== 'ProcessedMessage') {
          allFields.add(key);
        }
      });
    });

    // Define the preferred order of fields
    const preferredOrder = [
      'PersonId',
      'Feed',
      'DMLOperation',
      'IsProcessed',
      'WorkerType',
      'ProcessedMessage',
      'PublishedDateTime',
      'UpdatedDateTime'
    ];

    // Sort fields according to preferred order
    return Array.from(allFields).sort((a, b) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  const getDisplayFieldName = (field) => {
    const fieldMappings = {
      PersonId: 'Person ID',
      EntryId: 'Entry ID',
      DMLOperation: 'Operation',
      IsProcessed: 'Status',
      WorkerType: 'Worker',
      ProcessedMessage: 'Message',
      PublishedDateTime: 'Published',
      UpdatedDateTime: 'Updated'
    };
    return fieldMappings[field] || field;
  };

  const getFieldWidth = (field) => {
    const widthMappings = {
      ProcessedMessage: 'w-[250px] pr-4 whitespace-normal',
      PublishedDateTime: 'w-[120px] pl-4 whitespace-nowrap',
      PersonId: 'w-[80px] pr-0 whitespace-nowrap',
      Feed: 'w-[100px] pl-0 whitespace-nowrap',
      DMLOperation: 'w-[80px]',
      IsProcessed: 'w-[70px]',
      WorkerType: 'w-[70px]'
    };
    
    if (field.toLowerCase().includes('datetime')) return 'w-[120px]';
    return widthMappings[field] || 'w-[100px]';
  };

  const getCellContent = (field, value) => {
    if (field === 'IsProcessed') {
      return value ? (
        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Processed
        </span>
      ) : (
        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          Pending
        </span>
      );
    }
    
    if (field.toLowerCase().includes('datetime')) {
      return new Date(value).toISOString();
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    return value || '-';
  };

  const getStatusButtonClass = (isProcessed) => {
    const baseClass = 'p-0.5 transition-colors';
    const colorClass = isProcessed 
      ? 'text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-400'
      : 'text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400';
    return `${baseClass} ${colorClass}`;
  };

  const getRowBackgroundClass = (isSelected) => {
    return isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-800';
  };

  const getContainerClass = (isLoading) => {
    return `mb-2 ${isLoading ? 'opacity-60' : ''}`;
  };

  const handleToggleProcessedStatus = async (record) => {
    try {
      setProcessingRecord(record.EntryId);
      setError(null);
      setStatusUpdateError(null);
      
      // Set the status to the opposite of the current status
      const newStatus = !record.IsProcessed;
      
      await updateRecordProcessedStatus(record.PersonId, record.EntryId, newStatus);
      
      // Notify parent component about the update
      if (onRecordDeleted) {
        // We can reuse the onRecordDeleted callback to refresh the data
        onRecordDeleted();
      }
    } catch (err) {
      setStatusUpdateError(`Failed to update status: ${err.message}`);
    } finally {
      setProcessingRecord(null);
    }
  };

  const handleInfoClick = (record) => {
    setInfoRecord(record);
  };
  
  const handleCloseInfo = () => {
    setInfoRecord(null);
  };

  const getBooleanValueStyle = (key, value) => {
    if (key === 'IsProcessed') {
      return value 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  };

  const renderValue = (key, value) => {
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${getBooleanValueStyle(key, value)}`}>
          {value.toString()}
        </span>
      );
    }
    if (key.toLowerCase().includes('datetime')) {
      return (
        <span className="text-gray-900 dark:text-white">
          {new Date(value).toISOString() || '-'}
        </span>
      );
    }
    if (key === 'EntryId') {
      return (
        <span className="text-gray-900 dark:text-white font-mono break-all">
          {value || '-'}
        </span>
      );
    }
    return (
      <span className="text-gray-900 dark:text-white">
        {value || '-'}
      </span>
    );
  };

  if (!records || records.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No records found</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg shadow-md">
      {error && (
        <div className="p-4 rounded bg-red-100 dark:bg-red-900 mb-4 text-gray-900 dark:text-white">
          <p>{error}</p>
        </div>
      )}

      {statusUpdateError && (
        <div className="p-4 mb-4 bg-red-100 dark:bg-red-900 rounded-lg text-red-700 dark:text-red-300">
          <p>{statusUpdateError}</p>
          <button 
            onClick={() => setStatusUpdateError(null)}
            className="mt-2 px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-900/70 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Confirm Delete</h3>
            <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete the record for:
              </p>
              <p className="mt-2 font-mono text-sm bg-gray-100 dark:bg-gray-600 p-2 rounded text-gray-900 dark:text-white">
                Person ID: <strong>{confirmDelete.PersonId}</strong>
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoRecord && (
        <div className="fixed inset-0 bg-gray-900/70 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">Record Details</h3>
              <button
                onClick={handleCloseInfo}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getFieldNames().map(field => {
                  if (infoRecord[field] !== undefined) {
                    return (
                      <div key={field} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-400 mb-1">{getDisplayFieldName(field)}</h4>
                        <div className="overflow-hidden mt-1">
                          {renderValue(field, infoRecord[field])}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
                {/* Display EntryId and other excluded fields */}
                {Object.entries(infoRecord)
                  .filter(([key]) => !getFieldNames().includes(key) && key !== 'ConstantKey' && key !== 'CorrelationEntryId')
                  .map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-400 mb-1">{key}</h4>
                      <div className="overflow-hidden mt-1">
                        {renderValue(key, value)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleCloseInfo}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBatchDelete && (
        <div className="fixed inset-0 bg-gray-900/70 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Confirm Batch Delete</h3>
            <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300">
                You are about to delete:
              </p>
              <p className="mt-2 font-medium text-lg bg-gray-100 dark:bg-gray-600 p-2 rounded flex items-center justify-center text-red-600 dark:text-red-300">
                <span className="mr-2">{selectedRecords.length}</span> 
                {selectedRecords.length === 1 ? 'record' : 'records'}
              </p>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelBatchDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          </div>
        )}

        <div className="w-full overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr className="border-b-2 border-gray-200 dark:border-gray-700 shadow-sm">
                  <th className="py-4 px-2 pl-4 text-left w-10 sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 font-extrabold text-indigo-700 dark:text-indigo-300">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Select all visible records
                          setSelectedRecords(
                            filteredRecords.map(record => ({
                              PersonId: record.PersonId,
                              EntryId: record.EntryId
                            }))
                          );
                        } else {
                          // Deselect all
                          setSelectedRecords([]);
                        }
                      }}
                      checked={
                        filteredRecords.length > 0 &&
                        selectedRecords.length === filteredRecords.length
                      }
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  {getFieldNames().map(field => (
                    <th
                      key={field}
                      className="py-4 px-0.5 text-left text-md font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider"
                    >
                      {getDisplayFieldName(field)}
                    </th>
                  ))}
                  <th className="py-4 px-0.5 text-left text-md font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, rowIndex) => (
                  <tr
                    key={`${record.PersonId}#${record.EntryId}`}
                    className={`border-b border-gray-200 dark:border-gray-700 ${getRowBackgroundClass(isSelected(record))} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <td className="py-3 px-2 pl-4 sticky left-0 z-20 ${getRowBackgroundClass(isSelected(record))}">
                      <input
                        type="checkbox"
                        onChange={() => handleSelectRecord(record)}
                        checked={isSelected(record)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    {getFieldNames().map(field => (
                      <td key={field} className={`py-3 text-gray-900 dark:text-gray-300 ${getFieldWidth(field)}`}>
                        {getCellContent(field, record[field])}
                      </td>
                    ))}
                    <td className="py-3 px-0 w-20">
                      <div className="flex space-x-1">
                        {/* Info Button */}
                        <button
                          onClick={() => handleInfoClick(record)}
                          className="p-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
                          aria-label="View record details"
                        >
                          <InformationCircleIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleProcessedStatus(record)}
                          disabled={loading || processingRecord === record.EntryId}
                          className={getStatusButtonClass(record.IsProcessed)}
                          aria-label={record.IsProcessed ? "Mark as unprocessed" : "Mark as processed"}
                        >
                          <ArrowPathIcon className={`h-5 w-5 ${processingRecord === record.EntryId ? 'animate-spin' : ''}`} />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(record)}
                          disabled={loading}
                          className="p-0.5 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                          aria-label="Delete record"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

RecordTable.propTypes = {
  records: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRecordDeleted: PropTypes.func,
  onBatchDelete: PropTypes.func,
  onClearSearch: PropTypes.func,
  onSelectRecords: PropTypes.func,
  isLoading: PropTypes.bool,
  activeFilters: PropTypes.shape({
    statusFilter: PropTypes.string,
    workerFilter: PropTypes.string,
    feedFilter: PropTypes.string,
    operationFilter: PropTypes.string
  })
};

// Attach Filters component to RecordTable
RecordTable.Filters = TableFilters;

export default RecordTable;