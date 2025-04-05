const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, BatchWriteCommand, ScanCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../../config/logger');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/env');
// Initialize default clients
let docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: config.AWS_REGION
  })
);
let tableName = config.TABLE_NAME;

/**
 * Get the DynamoDB client
 * @returns {DynamoDBClient} The DynamoDB client
 */
const getClient = () => client;

/**
 * Get the DynamoDB document client
 * @returns {DynamoDBDocumentClient} The DynamoDB document client
 */
const getDocClient = () => docClient;

/**
 * Set the DynamoDB document client (for testing)
 * @param {DynamoDBDocumentClient} client - The DynamoDB document client to use
 */
const setDocClient = (client) => {
  docClient = client;
};

/**
 * Get the DynamoDB table name
 * @returns {string} The DynamoDB table name
 */
const getTableName = () => tableName;

/**
 * Set the DynamoDB table name (for testing)
 * @param {string} name - The table name to use
 */
const setTableName = (name) => {
  tableName = name;
};

/**
 * Generate a 32-character hexadecimal ID in the format: urn:uuid:3113101A18414AF9E0635220010A8E86
 * @returns {string} UUID string with urn:uuid: prefix followed by 32-character uppercase hexadecimal
 */
const generateEntryId = () => {
  // Generate 16 random bytes (128 bits)
  const bytes = Buffer.from(uuidv4().replace(/-/g, ''), 'hex');
  // Convert to uppercase hexadecimal and prepend urn:uuid:
  return `urn:uuid:${bytes.toString('hex').toUpperCase()}`;
};

/**
 * Create a new record in DynamoDB
 * @param {Object} record - The record to create
 * @returns {Promise<Object>} The created record
 */
const createRecord = async (record) => {
  logger.debug(`Processing record for creation: PersonId=${record.PersonId}, Feed=${record.Feed}, DMLOperation=${record.DMLOperation}, IsProcessed=${record.IsProcessed}, WorkerType=${record.WorkerType}, ProcessedMessage="${record.ProcessedMessage}"`);

  // Validate required fields
  if (!record.PersonId || !record.Feed || !record.DMLOperation || 
      record.IsProcessed === undefined || !record.WorkerType || !record.ProcessedMessage) {
    throw new Error('PersonId, Feed, DMLOperation, IsProcessed, WorkerType, and ProcessedMessage are required fields');
  }

  const now = new Date().toISOString();

  // Create the processed record with required fields
  const processedRecord = {
    ...record,
    ConstantKey: 'Constant',
    PublishedDateTime: now,
    UpdatedDateTime: now,
    EntryId: record.EntryId || generateEntryId()
  };

  const params = {
    TableName: getTableName(),
    Item: processedRecord,
  };

  logger.debug(`Sending record to DynamoDB: Table=${getTableName()}, PersonId=${processedRecord.PersonId}, EntryId=${processedRecord.EntryId}`);

  try {
    await getDocClient().send(new PutCommand(params));
    logger.info(`Record successfully saved to DynamoDB: PersonId=${processedRecord.PersonId}, EntryId=${processedRecord.EntryId}`);
    return processedRecord;
  } catch (error) {
    logger.error(`Error saving record to DynamoDB: ${error.message}`);
    logger.error(`Record details: ${JSON.stringify(processedRecord, null, 2)}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Get records sorted by PublishedDateTime with pagination using PublishedIndex
 * @param {number} limit - Number of records to return
 * @param {string} lastEvaluatedKey - Last evaluated key for pagination (base64 encoded)
 * @returns {Promise<Object>} - Object containing items array, count, and nextToken for pagination
 */
const getRecordsSortedByPublishedDateTime = async (limit, lastEvaluatedKey = null) => {
  const params = {
    TableName: getTableName(),
    IndexName: "PublishedIndex",
    KeyConditionExpression: "ConstantKey = :ck",
    ExpressionAttributeValues: {
      ":ck": "Constant",
    },
    ScanIndexForward: false, // This ensures newest first (descending order by PublishedDateTime)
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString());
  }

  try {
    const result = await getDocClient().send(new QueryCommand(params));
    
    // Format the response
    const response = {
      items: result.Items,
      count: result.Count,
    };

    // Add pagination token if there are more results
    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return response;
  } catch (error) {
    logger.error(`Error querying PublishedIndex: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Delete a record by PersonId and EntryId
 * @param {string} personId - The PersonId of the record
 * @param {string} entryId - The EntryId of the record
 * @returns {Promise<void>}
 */
const deleteRecord = async (personId, entryId) => {
  if (!personId || !entryId) {
    throw new Error('PersonId and EntryId are required for deletion');
  }

  try {
    // Delete using both partition key (PersonId) and sort key (EntryId)
    const deleteParams = {
      TableName: getTableName(),
      Key: {
        PersonId: personId,
        EntryId: entryId
      }
    };

    logger.debug(`Attempting to delete record: PersonId=${personId}, EntryId=${entryId}`);
    const deleteCommand = new DeleteCommand(deleteParams);
    await getDocClient().send(deleteCommand);
    logger.info(`Record deleted successfully: PersonId=${personId}, EntryId=${entryId}`);
  } catch (error) {
    logger.error(`Error deleting record: ${error.message}`);
    logger.error(`Delete parameters: ${JSON.stringify(deleteParams)}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Batch delete multiple records
 * @param {Array<Object>} records - Array of records to delete, each with PersonId and EntryId
 * @returns {Promise<void>}
 */
const batchDeleteRecords = async (records) => {
  // DynamoDB BatchWrite can process up to 25 items at once
  const BATCH_SIZE = 25;
  
  // Validate records array
  if (!Array.isArray(records) || records.length === 0) {
    logger.error('Invalid records array provided for batch deletion');
    throw new Error('Invalid records array provided for batch deletion');
  }

  logger.debug(`Batch delete request received for ${records.length} records`);

  // Validate each record has required keys
  records.forEach((record, index) => {
    if (!record.PersonId || !record.EntryId) {
      throw new Error(`Record at index ${index} is missing required PersonId or EntryId`);
    }
  });
  
  // Process records in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const deleteRequests = batch.map(record => ({
      DeleteRequest: {
        Key: {
          PersonId: record.PersonId,
          EntryId: record.EntryId
        },
      },
    }));

    const params = {
      RequestItems: {
        [getTableName()]: deleteRequests,
      },
    };

    try {
      await getDocClient().send(new BatchWriteCommand(params));
      logger.info(`Batch of ${deleteRequests.length} records deleted successfully`);
      logger.debug(`Deleted records in batch: ${JSON.stringify(batch.map(r => ({ PersonId: r.PersonId, EntryId: r.EntryId })))}`);
    } catch (error) {
      logger.error(`Error deleting batch of records: ${error.message}`);
      logger.error(`Batch details: ${JSON.stringify(batch)}`);
      logger.error(error.stack);
      throw error;
    }
  }
};

/**
 * Search records by PersonId
 * @param {string} personId - The PersonId to search for
 * @returns {Promise<Array>} - Array of matching records
 */
const searchByPersonId = async (personId) => {
  logger.debug(`[Repository] Searching records with PersonId: ${personId} (type: ${typeof personId})`);

  const searchValue = personId.toString().trim();
  logger.debug(`[Repository] Search value after processing: "${searchValue}"`);

  const scanParams = {
    TableName: getTableName(),
    FilterExpression: 'PersonId = :personId',
    ExpressionAttributeValues: {
      ':personId': searchValue
    }
  };

  logger.debug(`[Repository] Executing scan with params:`, scanParams);

  try {
    const command = new ScanCommand(scanParams);
    const { Items } = await getDocClient().send(command);
    logger.info(`[Repository] Found ${Items.length} exact matches for PersonId: ${searchValue}`);
    return Items;
  } catch (error) {
    logger.error(`[Repository] Error searching records: ${error.message}`);
    throw error;
  }
};

/**
 * Update a record's IsProcessed status
 * @param {string} personId - The PersonId of the record
 * @param {string} entryId - The EntryId of the record
 * @param {boolean} isProcessed - The new IsProcessed status
 * @returns {Promise<Object>} - The updated record
 */
const updateRecordProcessedStatus = async (personId, entryId, isProcessed) => {
  if (!personId || !entryId) {
    throw new Error('PersonId and EntryId are required for updating');
  }

  const now = new Date().toISOString();

  try {
    const params = {
      TableName: getTableName(),
      Key: {
        PersonId: personId,
        EntryId: entryId
      },
      UpdateExpression: 'SET IsProcessed = :isProcessed, UpdatedDateTime = :updatedDateTime',
      ExpressionAttributeValues: {
        ':isProcessed': isProcessed,
        ':updatedDateTime': now
      },
      ReturnValues: 'ALL_NEW'
    };

    logger.debug(`Attempting to update record processed status: PersonId=${personId}, EntryId=${entryId}, IsProcessed=${isProcessed}`);
    const command = new UpdateCommand(params);
    const result = await getDocClient().send(command);
    
    if (!result.Attributes) {
      throw new Error('Record not found');
    }
    
    logger.info(`Record processed status updated successfully: PersonId=${personId}, EntryId=${entryId}, IsProcessed=${isProcessed}`);
    return result.Attributes;
  } catch (error) {
    logger.error(`Error updating record processed status: ${error.message}`);
    logger.error(error.stack);
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
 * @param {string} lastEvaluatedKey - Last evaluated key for pagination (base64 encoded)
 * @returns {Promise<Object>} - Object containing items array, count, and nextToken for pagination
 */
const getFilteredRecords = async (feed, operation, status, worker, limit, lastEvaluatedKey = null) => {
  // When using FilterExpression, the Limit applies to items evaluated BEFORE filtering
  // To ensure we get enough items after filtering, use a much higher internal limit
  // This multiplier can be adjusted based on your data characteristics
  const INTERNAL_LIMIT_MULTIPLIER = 20;
  const internalLimit = limit * INTERNAL_LIMIT_MULTIPLIER;
  
  const params = {
    TableName: getTableName(),
    IndexName: "PublishedIndex",
    KeyConditionExpression: "ConstantKey = :ck",
    ExpressionAttributeValues: {
      ":ck": "Constant",
    },
    ScanIndexForward: false, // Newest first (descending order)
    Limit: internalLimit, // Use higher internal limit to ensure enough items after filtering
  };

  // Building filter expressions for the optional parameters
  const filterConditions = [];
  
  if (feed) {
    filterConditions.push("Feed = :feed");
    params.ExpressionAttributeValues[":feed"] = feed;
  }
  
  if (operation) {
    filterConditions.push("DMLOperation = :operation");
    params.ExpressionAttributeValues[":operation"] = operation;
  }
  
  if (status !== undefined && status !== null) {
    const isProcessed = status.toLowerCase() === 'true' || status === true;
    filterConditions.push("IsProcessed = :status");
    params.ExpressionAttributeValues[":status"] = isProcessed;
  }
  
  if (worker) {
    filterConditions.push("WorkerType = :worker");
    params.ExpressionAttributeValues[":worker"] = worker;
  }
  
  // If we have filter conditions, add them to the params
  if (filterConditions.length > 0) {
    params.FilterExpression = filterConditions.join(" AND ");
  }

  // Handle pagination
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString());
  }

  try {
    logger.debug(`Querying records with filters: ${JSON.stringify(params)}`);
    const result = await getDocClient().send(new QueryCommand(params));

    // Format the response
    const response = {
      // Limit the returned items to the requested limit
      items: result.Items.slice(0, limit),
      count: Math.min(result.Count, limit),
    };

    // Add pagination token if there are more results
    if (result.LastEvaluatedKey || result.Items.length > limit) {
      if (result.Items.length > limit) {
        // Create a custom LastEvaluatedKey from the last visible item
        const lastItem = result.Items[limit - 1];
        response.nextToken = Buffer.from(JSON.stringify({
          ConstantKey: lastItem.ConstantKey,
          PublishedDateTime: lastItem.PublishedDateTime
        })).toString('base64');
      } else {
        response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }
    }

    logger.debug(`Retrieved ${result.Count} items with filter, returning ${response.items.length} after limit`);
    return response;
  } catch (error) {
    logger.error(`Error querying filtered records: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

module.exports = {
  createRecord,
  deleteRecord,
  batchDeleteRecords,
  searchByPersonId,
  getRecordsSortedByPublishedDateTime,
  updateRecordProcessedStatus,
  getFilteredRecords,
  getDocClient,
  getTableName,
  setDocClient,
  setTableName
}; 