const recordRepository = require('../../models/record/recordRepository');
const logger = require('../../config/logger');

/**
 * Create a new record
 * @route POST /api/records
 */
const createRecord = async (req, res) => {
  logger.info('[Controller] Starting record creation process...');
  logger.debug(`[Controller] Record data received: PersonId=${req.body.PersonId}, Feed=${req.body.Feed}, DMLOperation=${req.body.DMLOperation}, IsProcessed=${req.body.IsProcessed}, WorkerType=${req.body.WorkerType}, ProcessedMessage="${req.body.ProcessedMessage}"`);
  
  try {
    const record = req.body;
    const result = await recordRepository.createRecord(record);
    
    logger.info(`[Controller] Record created successfully: PersonId=${result.PersonId}, EntryId=${result.EntryId}, PublishedDateTime=${result.PublishedDateTime}`);
    
    res.status(201).json({
      message: 'Record created successfully',
      data: result,
    });
  } catch (error) {
    logger.error(`[Controller] Error creating record: ${error.message}`);
    logger.error(error.stack);
    
    res.status(500).json({
      message: 'Failed to create record',
      error: error.message,
    });
  }
};

module.exports = {
  createRecord,
}; 