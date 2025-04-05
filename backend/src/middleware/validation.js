const Joi = require('joi');
const logger = require('../config/logger');

// Schema for creating a new record
const recordSchema = Joi.object({
  // Required fields
  PersonId: Joi.string().required(),
  Feed: Joi.string().required(),
  DMLOperation: Joi.string().valid('INSERT', 'UPDATE', 'DELETE').required(),
  IsProcessed: Joi.boolean().required(),
  WorkerType: Joi.string().required(),
  ProcessedMessage: Joi.string().required(),

  // Optional fields
  EntryId: Joi.string().pattern(/^[A-F0-9]{32}$/),

  // Server-managed fields that should not be provided
  ConstantKey: Joi.forbidden(),
  PublishedDateTime: Joi.forbidden(),
  UpdatedDateTime: Joi.forbidden()
}).unknown(false); // Don't allow additional fields

// Schema for single delete operation
const deleteSchema = Joi.object({
  personId: Joi.string().required(),
  entryId: Joi.string().pattern(/^urn:uuid:[A-F0-9]{32}$/).required()
    .messages({
      'string.pattern.base': 'entryId must be in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX where X is a hexadecimal digit (A-F, 0-9)'
    })
}).unknown(false);

// Schema for batch delete operation
const batchDeleteSchema = Joi.object({
  records: Joi.array().items(
    Joi.object({
      personId: Joi.string().required(),
      entryId: Joi.string().pattern(/^urn:uuid:[A-F0-9]{32}$/).required()
        .messages({
          'string.pattern.base': 'entryId must be in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX where X is a hexadecimal digit (A-F, 0-9)'
        })
    }).unknown(false)
  ).min(1).required()
}).unknown(false);

// Schema for updating record processed status
const updateProcessedStatusSchema = Joi.object({
  personId: Joi.string().required(),
  entryId: Joi.string().pattern(/^urn:uuid:[A-F0-9]{32}$/).required()
    .messages({
      'string.pattern.base': 'entryId must be in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX where X is a hexadecimal digit (A-F, 0-9)'
    }),
  isProcessed: Joi.boolean().required()
}).unknown(false);

// Middleware to validate record creation
const validateRecord = (req, res, next) => {
  logger.debug('[Validation] Starting record validation...');
  logger.debug(`[Validation] Received record: ${JSON.stringify(req.body)}`);

  const { error } = recordSchema.validate(req.body);
  if (error) {
    logger.warn(`[Validation] Validation failed: ${error.details[0].message}`);
    return res.status(400).json({
      message: 'Validation error',
      error: error.details[0].message
    });
  }

  logger.info('[Validation] Record validation successful');
  next();
};

// Middleware to validate single delete
const validateDelete = (req, res, next) => {
  logger.debug(`[Validation] Starting delete validation... Request body: ${JSON.stringify(req.body)}`);

  const { error } = deleteSchema.validate(req.body);
  if (error) {
    logger.warn(`[Validation] Delete validation failed: ${error.details[0].message}`);
    return res.status(400).json({
      message: 'Validation error',
      error: error.details[0].message
    });
  }

  logger.info('[Validation] Delete validation successful');
  next();
};

// Middleware to validate batch delete
const validateBatchDelete = (req, res, next) => {
  const { error } = batchDeleteSchema.validate(req.body);

  if (error) {
    logger.warn(`[Validation] Batch delete validation failed: ${error.details[0].message}`);
    return res.status(400).json({
      message: 'Validation error',
      error: error.details[0].message
    });
  }

  logger.info('[Validation] Batch delete validation successful');
  next();
};

// Middleware to validate update processed status
const validateUpdateProcessedStatus = (req, res, next) => {
  logger.debug(`[Validation] Starting update processed status validation... Request body: ${JSON.stringify(req.body)}`);

  const { error } = updateProcessedStatusSchema.validate(req.body);
  if (error) {
    logger.warn(`[Validation] Update processed status validation failed: ${error.details[0].message}`);
    return res.status(400).json({
      message: 'Validation error',
      error: error.details[0].message
    });
  }

  logger.info('[Validation] Update processed status validation successful');
  next();
};

module.exports = {
  validateRecord,
  validateBatchDelete,
  validateDelete,
  validateUpdateProcessedStatus
}; 