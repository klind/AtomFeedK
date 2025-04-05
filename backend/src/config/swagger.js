const swaggerJsdoc = require('swagger-jsdoc');

// Determine the server URL based on environment
let serverUrl = 'http://localhost:5000';
let serverDescription = 'Local Development Server';

// Use Beanstalk URL for dev environment
if (process.env.NODE_ENV === 'dev') {
  // Use the Beanstalk environment URL
  // This is the URL of the cloudfront that is in front of the beanstalk application  
  // Swagger is accessing the backend API through the cloudfront URL  
  serverUrl = process.env.API_CLOUDFRONT_URL;
  serverDescription = 'Dev Beanstalk Environment';
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HCM Atom Feed API',
      version: '1.0.0',
      description: 'API for managing HCM Atom Feed records in DynamoDB',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: serverUrl,
        description: serverDescription,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Cognito ID token here'
        }
      },
      schemas: {
        Record: {
          type: 'object',
          required: ['PersonId', 'Feed', 'DMLOperation', 'IsProcessed', 'WorkerType', 'ProcessedMessage'],
          properties: {
            PersonId: {
              type: 'string',
              description: 'The person identifier (required)',
              example: '108'
            },
            Feed: {
              type: 'string',
              description: 'The feed name (required)',
              example: 'empassignment'
            },
            DMLOperation: {
              type: 'string',
              description: 'The DML operation type (required)',
              enum: ['INSERT', 'UPDATE', 'DELETE'],
              example: 'INSERT'
            },
            IsProcessed: {
              type: 'boolean',
              description: 'Processing status flag (required)',
              example: false
            },
            WorkerType: {
              type: 'string',
              description: 'Type of worker processing the record (required)',
              example: 'EMP'
            },
            ProcessedMessage: {
              type: 'string',
              description: 'Message describing the processing status (required)',
              example: 'Initial record creation'
            },
            EntryId: {
              type: 'string',
              description: 'Unique identifier for the entry (optional, server-generated if not provided)',
              example: 'urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9'
            },
          },
          example: {
            PersonId: "108",
            Feed: "empassignment",
            DMLOperation: "INSERT",
            IsProcessed: false,
            WorkerType: "EMP",
            ProcessedMessage: "Initial record creation"
          }
        },
        RecordResponse: {
          type: 'object',
          properties: {
            PersonId: {
              type: 'string',
              example: '108',
            },
            Feed: {
              type: 'string',
              example: 'empassignment',
            },
            DMLOperation: {
              type: 'string',
              example: 'INSERT',
            },
            IsProcessed: {
              type: 'boolean',
              example: false,
            },
            WorkerType: {
              type: 'string',
              example: 'EMP',
            },
            ProcessedMessage: {
              type: 'string',
              example: 'Initial record creation',
            },
            EntryId: {
              type: 'string',
              example: 'urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9',
              description: 'Server-generated UUID if not provided',
            },
            ConstantKey: {
              type: 'string',
              example: 'Constant',
              description: 'Server-side field, automatically set to "Constant"',
            },
            PublishedDateTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-03-26T09:43:39.137Z',
              description: 'Server-generated timestamp when the record is published',
            },
            UpdatedDateTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-03-26T09:43:39.137Z',
              description: 'Initially set to PublishedDateTime, updated when the record is modified',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    externalDocs: {
      description: 'Authentication Documentation',
      url: '/SWAGGER_AUTH.md'
    }
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 