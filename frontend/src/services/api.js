import { fetchAuthSession } from 'aws-amplify/auth';
// API URL - will be overridden by environment variables in production
import { getConfigValue } from '../utils/config';

// Get API URL from config value function
const getApiUrl = () => {
  try {
    return getConfigValue('apiUrl') + '/api';
  } catch (error) {
    // If config isn't loaded, use a fallback URL based on the current origin
    console.warn('Config not loaded, using fallback API URL', error);
    return process.env.REACT_APP_API_URL || window.location.origin;
  }
};

// Helper function to get authentication headers
const getAuthHeaders = async () => {
  try {
    // Try up to 3 times to get a valid token with small delays
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const session = await fetchAuthSession();
      // Check if tokens and idToken exist before accessing them
      if (session && session.tokens && session.tokens.idToken) {
        const token = session.tokens.idToken.toString();
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      } else {
        // Wait and try again if no token
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Token not available yet, attempt ${attempts}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    console.warn('Could not get auth token after multiple attempts');
    // Return basic headers if tokens are not available
    return {
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Return basic headers if not authenticated
    return {
      'Content-Type': 'application/json'
    };
  }
};

/**
 * Create a new record
 * @param {Object} record - The record to create
 * @returns {Promise<Object>} - The created record
 */
export const createRecord = async (record) => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create record');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating record:', error);
    throw error;
  }
};

/**
 * Get records with pagination
 * @param {number} limit - Number of records to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} - Records and pagination info
 */
export const getRecords = async (limit, nextToken = null, retryCount = 0) => {
  try {
    console.log("getRecords: ", JSON.stringify({ limit, nextToken, retryCount }));
    const API_URL = getApiUrl();
    let url = `${API_URL}/records?limit=${limit}`;
    if (nextToken) {
      url += `&nextToken=${nextToken}`;
    }

    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json();

      // Add retry logic for unauthorized errors - might be due to token not being ready
      if (errorData.error === 'Unauthorized: No token provided' && retryCount < 3) {
        console.log(`Auth token not ready yet, retrying (${retryCount + 1}/3)...`);
        // Wait a bit before retrying to give token time to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        return getRecords(limit, nextToken, retryCount + 1);
      }

      throw new Error(errorData.error || 'Failed to fetch records');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
};

/**
 * Delete a record by PersonId and EntryId
 * @param {string} personId - The unique person identifier
 * @param {string} entryId - The unique entry identifier in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 * @returns {Promise<Object>} - Success message
 */
export const deleteRecord = async (personId, entryId) => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/records`, {
      method: "DELETE",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personId,
        entryId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete record');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
};

/**
 * Batch delete multiple records
 * @param {Array<Object>} records - Array of records to delete, each containing personId and entryId
 * @returns {Promise<Object>} - Success message
 */
export const batchDeleteRecords = async (records) => {
  console.log("batchDeleteRecords: ", JSON.stringify({ records }));
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/records/batchdelete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        records: records.map(record => ({
          personId: record.PersonId,
          entryId: record.EntryId
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to batch delete records');
    }

    return await response.json();
  } catch (error) {
    console.error('Error batch deleting records:', error);
    throw error;
  }
};

export const getEnvironment = async () => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/environment`, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch environment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching environment:', error);
    throw error;
  }
};

/**
 * Search records by PersonId
 * @param {string} personId - The PersonId to search for
 * @returns {Promise<Object>} - Search results
 */
export const searchRecordsByPersonId = async (personId) => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/records/search?personId=${encodeURIComponent(personId)}`, {
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search records');
    }

    const result = await response.json();

    // Process any remaining BigInt values in the response
    const processData = (data) => {
      if (Array.isArray(data)) {
        return data.map(item => {
          const processed = {};
          for (const [key, value] of Object.entries(item)) {
            processed[key] = typeof value === 'bigint' ? value.toString() : value;
          }
          return processed;
        });
      }
      return data;
    };

    return {
      ...result,
      data: processData(result.data)
    };
  } catch (error) {
    console.error('Error searching records:', error);
    throw error;
  }
};

/**
 * Get the DynamoDB table name from the backend
 * @returns {Promise<Object>} - Object containing the table name
 */
export const getTableName = async () => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/config/table-name`, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch table name');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching table name:', error);
    throw error;
  }
};

/**
 * Update a record's IsProcessed status
 * @param {string} personId - The unique person identifier
 * @param {string} entryId - The unique entry identifier
 * @param {boolean} isProcessed - The new IsProcessed status
 * @returns {Promise<Object>} - Updated record and success message
 */
export const updateRecordProcessedStatus = async (personId, entryId, isProcessed) => {
  try {
    const API_URL = getApiUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/records/processed-status`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personId,
        entryId,
        isProcessed
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update record status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating record status:', error);
    throw error;
  }
};

/**
 * Get filtered records based on feed, operation, status, and worker
 * @param {string} feed - The feed to filter by (optional)
 * @param {string} operation - The operation type to filter by (optional)
 * @param {string} status - The processing status to filter by (optional)
 * @param {string} worker - The worker type to filter by (optional)
 * @param {number} limit - Number of records to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} - Records and pagination info
 */
export const getFilteredRecords = async (feed, operation, status, worker, limit, nextToken = null) => {
  try {
    const API_URL = getApiUrl();
    let url = `${API_URL}/records/filter?limit=${limit}`;
    
    // Add filter parameters if they are not 'all'
    if (feed && feed !== 'all') url += `&feed=${encodeURIComponent(feed)}`;
    if (operation && operation !== 'all') url += `&operation=${encodeURIComponent(operation.toUpperCase())}`;
    
    // Convert status filter to boolean for the backend
    if (status && status !== 'all') {
      const isProcessed = status === 'processed';
      url += `&status=${isProcessed}`;
    }
    
    if (worker && worker !== 'all') url += `&worker=${encodeURIComponent(worker)}`;
    
    // Add pagination token if provided
    if (nextToken) url += `&nextToken=${encodeURIComponent(nextToken)}`;

    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch filtered records');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching filtered records:', error);
    throw error;
  }
};