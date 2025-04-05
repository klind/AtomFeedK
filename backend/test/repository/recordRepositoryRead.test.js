const path = require('path');
const RecordRepository = require('../../src/models/record/recordRepository');
const DynamoDBTestUtil = require('../utils/dynamoDBTestUtils');
const { CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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

describe('DynamoDB Local Tests', () => {
    beforeAll(async () => {
        // Start DynamoDB Local container and setup clients
        await dynamoDBTestUtil.startContainer();
        
        // Create table and seed data
        await dynamoDBTestUtil.createTable();
        
        // Load seed data from JSON file
        const seedDataPath = path.join(__dirname, 'dynamoDBSeedData.json');
        const count = await dynamoDBTestUtil.seedFromJson(seedDataPath);
        console.log(`Seeded ${count} records from dynamoDBSeedData.json`);
        
        // Use the setter methods to inject test dependencies
        RecordRepository.setDocClient(dynamoDBTestUtil.getDocClient());
        RecordRepository.setTableName(dynamoDBTestUtil.getTableName());
        
        // Verify table exists and has data
        await dynamoDBTestUtil.verifyTableAndData();
    }, 60000);

    afterAll(async () => {
        await dynamoDBTestUtil.stopContainer();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('DynamoDB should start and respond', async () => {
        const docClient = dynamoDBTestUtil.getDocClient();
        const scanParams = { TableName: dynamoDBTestUtil.getTableName() };
        const scanCommand = new ScanCommand(scanParams);
        const result = await docClient.send(scanCommand);
        expect(result.Items).toBeDefined();
        expect(result.Items.length).toBeGreaterThan(0);
    });

    test('getRecordsSortedByPublishedDateTime should return records sorted by PublishedDateTime', async () => {
        // Test with limit of 3 records
        const limit = 3;
        const result = await RecordRepository.getRecordsSortedByPublishedDateTime(limit);

        // Check basic response structure
        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(result.count).toBeDefined();
        expect(result.items.length).toBe(limit);
        expect(result.count).toBe(limit);

        // Verify records are sorted by PublishedDateTime in descending order
        for (let i = 0; i < result.items.length - 1; i++) {
            const currentDate = new Date(result.items[i].PublishedDateTime);
            const nextDate = new Date(result.items[i + 1].PublishedDateTime);
            expect(currentDate >= nextDate).toBe(true);
        }

        // Test pagination
        expect(result.nextToken).toBeDefined();
        
        // Get next page using the nextToken
        const nextPage = await RecordRepository.getRecordsSortedByPublishedDateTime(limit, result.nextToken);
        
        // Verify next page
        expect(nextPage.items).toBeDefined();
        expect(nextPage.items.length).toBe(limit);
        
        // Verify no overlap between pages
        const firstPageLastDate = new Date(result.items[result.items.length - 1].PublishedDateTime);
        const secondPageFirstDate = new Date(nextPage.items[0].PublishedDateTime);
        expect(firstPageLastDate >= secondPageFirstDate).toBe(true);
    });
    
    test('Query index directly', async () => {
        const params = {
            TableName: dynamoDBTestUtil.getTableName(),
            IndexName: "PublishedIndex",
            KeyConditionExpression: "ConstantKey = :ck",
            ExpressionAttributeValues: {
                ":ck": "Constant",
            },
            ScanIndexForward: false,
            Limit: 3,
        };
        const result = await dynamoDBTestUtil.getDocClient().send(new QueryCommand(params));
        expect(result.Items).toBeDefined();
    });
}); 