const Joi = require('joi');

// Schema for creating a new record
const recordSchema = Joi.object({
  // Only require Feed and PersonId from user input
  Feed: Joi.string().required(),
  PersonId: Joi.string().required(),
  
  // Timestamp can be optional as it may be set automatically
  Timestamp: Joi.number().optional(),
  
  // Keep person_id for backward compatibility
  //person_id: Joi.string().optional()
}).unknown(true); // Allow additional fields

// Schema for batch delete operation
const batchDeleteSchema = Joi.object({
  records: Joi.array().items(
    Joi.object({
      Constant_Key: Joi.string().required(),
      Feed: Joi.string().required(),
    })
  ).min(1).required(),
});

module.exports = {
  recordSchema,
  batchDeleteSchema,
}; 