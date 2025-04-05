const path = require('path');
const RecordRepository = require('../../src/models/record/recordRepository');
const DynamoDBTestUtil = require('../utils/dynamoDBTestUtils');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Mock the logger to avoid console output during tests
jest.mock('../../src/config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
}));

// Mock the config module to provide our test values
jest.mock('../../src/config/env', () => ({
    AWS_REGION: 'local',
    TABLE_NAME: 'testTable'
}));

// Setup the DynamoDB utility
const dynamoDBTestUtil = new DynamoDBTestUtil();

describe('RecordRepository - createRecord', () => {
    beforeAll(async () => {
        // Start DynamoDB Local container and setup clients
        await dynamoDBTestUtil.startContainer();
        
        // Create table
        await dynamoDBTestUtil.createTable();
        
        // Inject test dependencies using setter methods to override the default DynamoDB client
        // This allows us to use our local DynamoDB instance instead of a real AWS service
        // The setDocClient method lets us provide our test client that connects to DynamoDB Local
        // The setTableName method lets us specify our test table name
        RecordRepository.setDocClient(dynamoDBTestUtil.getDocClient());
        RecordRepository.setTableName(dynamoDBTestUtil.getTableName());
        
        // Verify table exists
        await dynamoDBTestUtil.verifyTableAndData();
    }, 60000);

    afterAll(async () => {
        await dynamoDBTestUtil.stopContainer();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper function to get all records in the table
    async function getAllRecords() {
        const docClient = dynamoDBTestUtil.getDocClient();
        const scanParams = { TableName: dynamoDBTestUtil.getTableName() };
        const scanCommand = new ScanCommand(scanParams);
        const result = await docClient.send(scanCommand);
        return result.Items;
    }

    test('should create a record with all required fields', async () => {
        // Create record with all required fields following the DB format
        const record = {
            PersonId: "300000002692304",
            Feed: "empassignment",
            DMLOperation: "INSERT",
            IsProcessed: false,
            WorkerType: "EMP",
            ProcessedMessage: "Test record creation"
        };

        const createdRecord = await RecordRepository.createRecord(record);

        // Verify the created record
        expect(createdRecord).toBeDefined();
        expect(createdRecord.PersonId).toBe(record.PersonId);
        expect(createdRecord.Feed).toBe(record.Feed);
        expect(createdRecord.DMLOperation).toBe(record.DMLOperation);
        expect(createdRecord.IsProcessed).toBe(record.IsProcessed);
        expect(createdRecord.WorkerType).toBe(record.WorkerType);
        expect(createdRecord.ProcessedMessage).toBe(record.ProcessedMessage);

        // Verify auto-generated/added fields
        expect(createdRecord.EntryId).toBeDefined();
        expect(createdRecord.EntryId.startsWith('urn:uuid:')).toBe(true);
        expect(createdRecord.ConstantKey).toBe('Constant');
        expect(createdRecord.PublishedDateTime).toBeDefined();
        expect(createdRecord.UpdatedDateTime).toBeDefined();

        // Verify record was actually saved to DynamoDB
        const records = await getAllRecords();
        const foundRecord = records.find(r => r.PersonId === record.PersonId && r.EntryId === createdRecord.EntryId);
        expect(foundRecord).toBeDefined();
    });

    test('should use provided EntryId when supplied', async () => {
        // Create record with custom EntryId following the DB format
        const customEntryId = 'urn:uuid:301A3415B6B77E6DE0635220010A27A0';
        const record = {
            PersonId: "300000003692305",
            Feed: "empassignment",
            DMLOperation: "UPDATE",
            IsProcessed: false,
            WorkerType: "EMP",
            ProcessedMessage: "Test message with custom EntryId",
            EntryId: customEntryId
        };

        const createdRecord = await RecordRepository.createRecord(record);

        // Verify the custom EntryId was used
        expect(createdRecord.EntryId).toBe(customEntryId);

        // Verify record was saved with custom EntryId
        const records = await getAllRecords();
        const foundRecord = records.find(r => r.EntryId === customEntryId);
        expect(foundRecord).toBeDefined();
    });

    test('should throw error when required fields are missing', async () => {
        // Create record missing required fields
        const invalidRecord = {
            PersonId: "300000004692306",
            // Missing Feed
            DMLOperation: "UPDATE",
            // Missing IsProcessed
            WorkerType: "EMP",
            // Missing ProcessedMessage
        };

        // Expect the createRecord function to throw an error
        await expect(RecordRepository.createRecord(invalidRecord))
            .rejects
            .toThrow('PersonId, Feed, DMLOperation, IsProcessed, WorkerType, and ProcessedMessage are required fields');
    });

    test('should preserve additional fields in the record', async () => {
        const record = {
            PersonId: "300000005692307",
            Feed: "empassignment",
            DMLOperation: "INSERT",
            IsProcessed: true,
            WorkerType: "EMP",
            ProcessedMessage: "Test with additional fields",
        };

        const createdRecord = await RecordRepository.createRecord(record);

        // Only verify the standard fields
        expect(createdRecord.PersonId).toBe(record.PersonId);
        expect(createdRecord.Feed).toBe(record.Feed);
        expect(createdRecord.DMLOperation).toBe(record.DMLOperation);
        expect(createdRecord.IsProcessed).toBe(record.IsProcessed);
        expect(createdRecord.WorkerType).toBe(record.WorkerType);
        expect(createdRecord.ProcessedMessage).toBe(record.ProcessedMessage);
        expect(createdRecord.EntryId).toBeDefined();
        expect(createdRecord.ConstantKey).toBe('Constant');
        expect(createdRecord.PublishedDateTime).toBeDefined();
        expect(createdRecord.UpdatedDateTime).toBeDefined();

        // Verify record was actually saved to DynamoDB
        const records = await getAllRecords();
        const foundRecord = records.find(r => r.PersonId === record.PersonId && r.EntryId === createdRecord.EntryId);
        expect(foundRecord).toBeDefined();
    });
});