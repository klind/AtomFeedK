/**
 * AWS Lambda function to be used as a Cognito Pre Sign-up Trigger
 * This function validates that the email domain ends with tv2.dk
 * 
 * To use this function:
 * 1. Create a new Lambda function in AWS
 * 2. Copy this code into the Lambda function
 * 3. Set the Lambda function as a Pre Sign-up Trigger in your Cognito User Pool
 */
const winston = require('winston');

// Create a simple logger for Lambda
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.handler = async (event, context) => {
  logger.info('Pre Sign-up Trigger Event:', JSON.stringify(event, null, 2));
  
  // Get the email from the event
  const { email } = event.request.userAttributes;
  
  // Validate email domain
  if (!email || !email.endsWith('@tv2.dk')) {
    logger.error(`Email validation failed: ${email} does not end with @tv2.dk`);
    throw new Error('Email domain not allowed. Only tv2.dk email addresses are permitted.');
  }
  
  logger.info(`Email validation passed: ${email}`);
  
  // Return the event object to allow the sign-up to proceed
  return event;
}; 