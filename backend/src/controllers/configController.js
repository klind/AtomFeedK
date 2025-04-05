const logger = require('../config/logger');

const getTableName = (req, res) => {
  logger.debug('Received request for table name');
  try {
    const tableName = process.env.TABLE_NAME;
    logger.debug(`TABLE_NAME from env: ${tableName}`);
    if (!tableName) {
      logger.debug('TABLE_NAME not found in environment');
      return res.status(404).json({ error: 'TABLE_NAME environment variable is not set' });
    }
    logger.debug(`Sending table name response: ${tableName}`);
    res.json({ tableName });
  } catch (error) {
    logger.error('Error getting table name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTableName
}; 