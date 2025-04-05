const logger = require('../../config/logger');
const recordRepository = require('../../models/record/recordRepository');

/**
 * Get records sorted by PublishedDateTime with pagination
 * @route GET /api/records
 */
const getRecordsSortedByPublishedDateTime = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    logger.debug(`Fetching records with limit=${limit}`);
    const nextToken = req.query.nextToken || null;
    const result = await recordRepository.getRecordsSortedByPublishedDateTime(limit, nextToken);
    logger.info(`Retrieved ${result.count} records out of requested limit ${limit}`);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching records:', error);
    res.status(500).json({
      message: 'Failed to fetch records',
      error: error.message,
    });
  }
};

/**
 * Get filtered records with pagination
 * @route GET /api/records/filter
 */
const getFilteredRecords = async (req, res) => {
  try {
    const feed = req.query.feed;
    const operation = req.query.operation;
    const status = req.query.status;
    const worker = req.query.worker;
    const limit = parseInt(req.query.limit) || 50;
    const nextToken = req.query.nextToken || null;
    
    logger.debug(`Fetching filtered records: feed=${feed}, operation=${operation}, status=${status}, worker=${worker}, limit=${limit}`);
    
    const result = await recordRepository.getFilteredRecords(feed, operation, status, worker, limit, nextToken);
    
    logger.info(`Retrieved ${result.count} filtered records out of requested limit ${limit}`);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching filtered records:', error);
    res.status(500).json({
      message: 'Failed to fetch filtered records',
      error: error.message,
    });
  }
};

module.exports = {
  getRecordsSortedByPublishedDateTime,
  getFilteredRecords
}; 