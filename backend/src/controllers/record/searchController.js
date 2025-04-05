const recordRepository = require('../../models/record/recordRepository');
const logger = require('../../config/logger');

/**
 * Search records by PersonId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchByPersonId = async (req, res) => {
  const { personId } = req.query;
  
  if (!personId) {
    return res.status(400).json({
      message: 'PersonId is required for search',
      error: 'Missing personId parameter'
    });
  }

  try {
    logger.debug(`[Controller] Searching for records with PersonId: ${personId}`);
    const results = await recordRepository.searchByPersonId(personId);
    
    res.status(200).json({
      message: `Found ${results.length} records`,
      data: results
    });
  } catch (error) {
    logger.error(`[Controller] Error searching records: ${error.message}`);
    res.status(500).json({
      message: 'Failed to search records',
      error: error.message
    });
  }
};

module.exports = {
  searchByPersonId
}; 