import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { getRecords, getFilteredRecords, searchRecordsByPersonId } from '../services/api';

/**
 * Custom hook for fetching and auto-updating records
 * @param {Object} options - Options for fetching records
 * @param {number} options.limit - Number of records to fetch
 * @param {string} options.nextToken - Pagination token
 * @param {Object} options.filters - Filters to apply
 * @param {string} options.personId - Person ID to search for
 * @param {boolean} options.autoUpdate - Whether to auto-update records
 * @param {number} options.autoUpdateInterval - Interval in ms to auto-update records
 * @returns {Object} - Query result and additional helpers
 */
const useRecords = ({
  limit = 10,
  nextToken = null,
  filters = {
    statusFilter: 'all',
    workerFilter: 'all',
    feedFilter: 'all',
    operationFilter: 'all'
  },
  personId = null,
  autoUpdate = false,
  autoUpdateInterval = 2000,
}) => {
  const queryClient = useQueryClient();
  const [isFiltered, setIsFiltered] = useState(false);

  // Determine if any filter is active
  useEffect(() => {
    const hasActiveFilters = 
      filters.statusFilter !== 'all' || 
      filters.workerFilter !== 'all' || 
      filters.feedFilter !== 'all' || 
      filters.operationFilter !== 'all';
    
    setIsFiltered(hasActiveFilters);
  }, [filters]);

  // Generate unique query key based on parameters
  const getQueryKey = useCallback(() => {
    if (personId) {
      return ['records', 'search', personId];
    }
    
    if (isFiltered) {
      return [
        'records', 
        'filtered', 
        filters.statusFilter, 
        filters.workerFilter, 
        filters.feedFilter, 
        filters.operationFilter,
        limit,
        nextToken
      ];
    }
    
    return ['records', limit, nextToken];
  }, [
    personId, 
    isFiltered, 
    filters.statusFilter, 
    filters.workerFilter, 
    filters.feedFilter, 
    filters.operationFilter, 
    limit, 
    nextToken
  ]);

  // Define query function based on parameters
  const queryFn = useCallback(async () => {
    if (personId) {
      const result = await searchRecordsByPersonId(personId);
      // Ensure we return data in the expected format regardless of API path
      return {
        items: result.data || [],
        nextToken: result.nextToken || null,
        totalCount: result.totalCount || result.data?.length || 0
      };
    }
    
    if (isFiltered) {
      const result = await getFilteredRecords(
        filters.feedFilter,
        filters.operationFilter,
        filters.statusFilter,
        filters.workerFilter,
        limit,
        nextToken
      );
      return result;
    }
    
    const result = await getRecords(limit, nextToken);
    return result;
  }, [
    personId, 
    isFiltered, 
    filters.feedFilter, 
    filters.operationFilter, 
    filters.statusFilter, 
    filters.workerFilter, 
    limit, 
    nextToken
  ]);

  // Set up query with React Query
  const query = useQuery({
    queryKey: getQueryKey(),
    queryFn,
    refetchInterval: autoUpdate ? autoUpdateInterval : false,
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching records:', error);
    },
    select: (data) => {
      // Ensure we always have a consistent data structure regardless of source
      return {
        items: data.items || data.data || [],
        nextToken: data.nextToken || null,
        totalCount: data.totalCount || (data.data ? data.data.length : 0)
      };
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Helper function to manually refetch data
  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  // Helper to clear search and return to regular records view
  const clearSearch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['records'] });
  }, [queryClient]);

  return {
    ...query,
    refetch,
    clearSearch,
    isFiltered,
    autoUpdate,
  };
};

export default useRecords; 