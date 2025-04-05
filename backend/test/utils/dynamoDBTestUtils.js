const { GenericContainer } = require('testcontainers');
const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const path = require('path');
const fs = require('fs');

/**
 * Utility class for setting up DynamoDB Local for testing
 */
class DynamoDBTestUtil {
    constructor() {
        this.container = null;
        this.dynamoClient = null;
        this.docClient = null;
        this.tableName = 'testTable';
        this.originalEnv = null;
    }

    /**
     * Start DynamoDB container and set up clients
     */
    async startContainer() {
        // Store original env variables
        this.originalEnv = { ...process.env };

        // Start DynamoDB Local container
        this.container = await new GenericContainer('amazon/dynamodb-local')
            .withExposedPorts(8000)
            .start();

        // Set environment variables
        process.env.AWS_REGION = 'local';
        process.env.TABLE_NAME = this.tableName;

        // Create DynamoDB client
        const dynamoEndpoint = `http://${this.container.getHost()}:${this.container.getMappedPort(8000)}`;

        this.docClient = DynamoDBDocumentClient.from(
            new DynamoDBClient({
                region: 'local',
                endpoint: dynamoEndpoint,
            })
        );

        return {
            dynamoClient: this.dynamoClient,
            docClient: this.docClient
        };
    }

    /**
     * Stop the container and restore environment
     */
    async stopContainer() {
        // Restore original env variables
        process.env = this.originalEnv;

        // Stop the container
        if (this.container) {
            await this.container.stop();
        }
    }

    /**
     * Create the table with default schema
     */
    async createTable() {
        await this.getDocClient().send(this.getCreateTableCommand());
    }

    /**
     * Get the create table command with defined schema including GSIs
     */
    getCreateTableCommand() {
        return new CreateTableCommand({
            TableName: this.tableName,
            AttributeDefinitions: [
                { AttributeName: 'ConstantKey', AttributeType: 'S' },
                { AttributeName: 'EntryId', AttributeType: 'S' },
                { AttributeName: 'PersonId', AttributeType: 'S' },
                { AttributeName: 'PublishedDateTime', AttributeType: 'S' },
                { AttributeName: 'UpdatedDateTime', AttributeType: 'S' },
            ],
            KeySchema: [
                { AttributeName: 'PersonId', KeyType: 'HASH' },
                { AttributeName: 'EntryId', KeyType: 'RANGE' },
            ],
            BillingMode: 'PAY_PER_REQUEST',  // On-demand pricing
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'PublishedIndex',
                    KeySchema: [
                        { AttributeName: 'ConstantKey', KeyType: 'HASH' },
                        { AttributeName: 'PublishedDateTime', KeyType: 'RANGE' },
                    ],
                    Projection: {
                        ProjectionType: 'ALL',
                    },
                },
                {
                    IndexName: 'EntryIndex',
                    KeySchema: [
                        { AttributeName: 'EntryId', KeyType: 'HASH' },
                    ],
                    Projection: {
                        ProjectionType: 'ALL',
                    },
                },
                {
                    IndexName: 'UpdatedIndex',
                    KeySchema: [
                        { AttributeName: 'ConstantKey', KeyType: 'HASH' },
                        { AttributeName: 'UpdatedDateTime', KeyType: 'RANGE' },
                    ],
                    Projection: {
                        ProjectionType: 'ALL',
                    },
                },
            ],
            DeletionProtectionEnabled: false,
        });
    }

    /**
     * Seed data from JSON file
     * @param {string} seedDataPath Path to the JSON file with seed data
     */
    async seedFromJson(seedDataPath) {
        try {
            const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
            await this.seedData(seedData.items);
            return seedData.items.length;
        } catch (error) {
            console.error('Error seeding data from JSON:', error);
            throw error;
        }
    }

    /**
     * Seed data from array of records
     * @param {Array} records Array of record objects to seed
     */
    async seedData(records) {
        for (const record of records) {
            await this.getDocClient().send(new PutCommand({
                TableName: this.tableName,
                Item: record
            }));
        }
        return records.length;
    }

    /**
     * Verify the table exists and has data
     */
    async verifyTableAndData() {
        const listTablesResult = await this.getDocClient().send(new ListTablesCommand({}));
        console.log("Tables in DynamoDB:", listTablesResult.TableNames);

        const scanParams = {
            TableName: this.tableName
        };
        const scanCommand = new ScanCommand(scanParams);
        const scanResult = await this.getDocClient().send(scanCommand);
        console.log(`Found ${scanResult.Items.length} items in the table`);

        return scanResult.Items;
    }

    /**
     * Get the DynamoDB client
     */
    /*getClient() {
        return this.dynamoClient;
    }

    /**
     * Get the DynamoDB Document client
     */
    getDocClient() {
        return this.docClient;
    }

    /**
     * Get the table name
     */
    getTableName() {
        return this.tableName;
    }
}

module.exports = DynamoDBTestUtil; 