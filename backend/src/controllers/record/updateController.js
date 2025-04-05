const recordRepository = require('../../models/record/recordRepository');
const logger = require('../../config/logger');

/**
 * Update a record's IsProcessed status
 * @route PATCH /api/records/processed-status
 */
const updateRecordProcessedStatus = async (req, res) => {
  try {
    const { personId, entryId, isProcessed } = req.body;
    
    logger.debug(`[Controller] Update processed status request for PersonId: ${personId}, EntryId: ${entryId}, IsProcessed: ${isProcessed}`);
    
    if (!personId || !entryId || isProcessed === undefined) {
      logger.warn('[Controller] Missing required parameters');
      return res.status(400).json({
        message: 'Validation error',
        error: 'personId, entryId, and isProcessed are required'
      });
    }
    
    const updatedRecord = await recordRepository.updateRecordProcessedStatus(personId, entryId, isProcessed);
    
    res.status(200).json({
      message: 'Record processed status updated successfully',
      data: updatedRecord
    });
  } catch (error) {
    logger.error(`[Controller] Error updating record processed status: ${error.message}`);
    logger.error(error.stack);
    
    if (error.message.includes('Record not found')) {
      return res.status(404).json({
        message: 'Record not found',
        error: error.message
      });
    }
    
    res.status(500).json({
      message: 'Failed to update record processed status',
      error: error.message
    });
  }
};

module.exports = {
  updateRecordProcessedStatus
}; 