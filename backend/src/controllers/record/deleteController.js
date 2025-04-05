const recordRepository = require('../../models/record/recordRepository');
const logger = require('../../config/logger');

/**
 * Delete a record by PersonId and EntryId
 * @route DELETE /api/records
 */
const deleteRecord = async (req, res) => {
  try {
    const { personId, entryId } = req.body;
    
    logger.debug(`[Controller] Delete request for PersonId: ${personId}, EntryId: ${entryId}`);
    
    if (!personId || !entryId) {
      logger.warn('[Controller] Missing required parameters');
      return res.status(400).json({
        message: 'Validation error',
        error: 'personId and entryId are required'
      });
    }
    
    await recordRepository.deleteRecord(personId, entryId);
    
    res.status(200).json({
      message: 'Record deleted successfully'
    });
  } catch (error) {
    logger.error(`[Controller] Error deleting record: ${error.message}`);
    logger.error(error.stack);
    
    if (error.message.includes('Record not found')) {
      return res.status(404).json({
        message: 'Record not found',
        error: error.message
      });
    }
    
    res.status(500).json({
      message: 'Failed to delete record',
      error: error.message
    });
  }
};

/**
 * Batch delete multiple records
 * @route DELETE /api/records/batchdelete
 */
const batchDeleteRecords = async (req, res) => {
  try {
    logger.debug(`[Controller] Batch delete request received: ${JSON.stringify(req.body)}`);
    const { records } = req.body;

    // Convert field names to match repository expectations
    const normalizedRecords = records.map(record => ({
      PersonId: record.personId,
      EntryId: record.entryId
    }));
    
    await recordRepository.batchDeleteRecords(normalizedRecords);
    
    res.status(200).json({
      message: `${records.length} records deleted successfully`,
    });
  } catch (error) {
    logger.error(`[Controller] Error batch deleting records: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      message: 'Failed to batch delete records',
      error: error.message,
    });
  }
};

module.exports = {
  deleteRecord,
  batchDeleteRecords,
}; 