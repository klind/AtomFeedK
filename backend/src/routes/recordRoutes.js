const express = require('express');
const router = express.Router();
const { createRecord } = require('../controllers/record/createController');
const { getRecordsSortedByPublishedDateTime, getFilteredRecords } = require('../controllers/record/readController');
const { deleteRecord, batchDeleteRecords } = require('../controllers/record/deleteController');
const { updateRecordProcessedStatus } = require('../controllers/record/updateController');
const { validateRecord, validateBatchDelete, validateDelete, validateUpdateProcessedStatus } = require('../middleware/validation');
const cognitoAuth = require('../middleware/cognitoAuth');
const { searchByPersonId } = require('../controllers/record/searchController');

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a new record
 *     tags: [Records]
 *     description: Creates a new record with required fields. EntryId, UpdatedDateTime, and PublishedDateTime are set by the server if not provided.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Record'
 *           example:
 *             PersonId: "108"
 *             Feed: "empassignment"
 *             DMLOperation: "INSERT"
 *             IsProcessed: false
 *             WorkerType: "EMP"
 *             ProcessedMessage: "Initial record creation"
 *     responses:
 *       201:
 *         description: Record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Record created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/RecordResponse'
 *               example:
 *                 message: "Record created successfully"
 *                 data:
 *                   PersonId: "108"
 *                   Feed: "empassignment"
 *                   DMLOperation: "INSERT"
 *                   IsProcessed: false
 *                   WorkerType: "EMP"
 *                   ProcessedMessage: "Initial record creation"
 *                   EntryId: "urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9"
 *                   ConstantKey: "Constant"
 *                   PublishedDateTime: "2025-03-26T09:43:39.137Z"
 *                   UpdatedDateTime: "2025-03-26T09:43:39.137Z"
 *       400:
 *         description: Validation error - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Validation error"
 *               error: "PersonId, Feed, DMLOperation, IsProcessed, WorkerType, and ProcessedMessage are required fields"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', cognitoAuth, validateRecord, createRecord);

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: Get records sorted by PublishedDateTime
 *     tags: [Records]
 *     description: Retrieves records sorted by PublishedDateTime using the PublishedIndex GSI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of records to return
 *       - in: query
 *         name: nextToken
 *         schema:
 *           type: string
 *         description: Pagination token for the next page
 *     responses:
 *       200:
 *         description: Successfully retrieved records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecordResponse'
 *                   description: List of records sorted by PublishedDateTime
 *                 count:
 *                   type: integer
 *                   description: Number of records returned
 *                 nextToken:
 *                   type: string
 *                   description: Token for retrieving the next page of results
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', cognitoAuth, getRecordsSortedByPublishedDateTime);

/**
 * @swagger
 * /api/records:
 *   delete:
 *     summary: Delete a record by PersonId and EntryId
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personId
 *               - entryId
 *             properties:
 *               personId:
 *                 type: string
 *                 description: The unique person identifier
 *               entryId:
 *                 type: string
 *                 pattern: '^urn:uuid:[A-F0-9]{32}$'
 *                 description: The unique entry identifier in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 *           example:
 *             personId: "108"
 *             entryId: "urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9"
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Record deleted successfully"
 *       400:
 *         description: Validation error - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Validation error"
 *               error: "entryId must be in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX where X is a hexadecimal digit (A-F, 0-9)"
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Record not found"
 *               error: "No record found with the specified PersonId and EntryId"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/', cognitoAuth, validateDelete, deleteRecord);

/**
 * @swagger
 * /api/records/batchdelete:
 *   delete:
 *     summary: Batch delete multiple records
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - personId
 *                     - entryId
 *                   properties:
 *                     personId:
 *                       type: string
 *                       description: The unique person identifier
 *                     entryId:
 *                       type: string
 *                       description: The unique entry identifier (32 character hexadecimal)
 *           example:
 *             records:
 *               - personId: "108"
 *                 entryId: "urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9"
 *               - personId: "109"
 *                 entryId: "urn:uuid:30AFAB82553F46D8A2E79A71356BB3A9"
 *     responses:
 *       200:
 *         description: Records deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Records deleted successfully"
 *       400:
 *         description: Validation error - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Validation error"
 *               error: "Record at index 0 is missing required personId or entryId"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/batchdelete', cognitoAuth, validateBatchDelete, batchDeleteRecords);

/**
 * @swagger
 * /api/records/search:
 *   get:
 *     summary: Search records by PersonId
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *         description: PersonId to search for
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Record'
 *       400:
 *         description: Missing PersonId parameter
 *       500:
 *         description: Server error
 */
router.get('/search', cognitoAuth, searchByPersonId);

/**
 * @swagger
 * /api/records/processed-status:
 *   patch:
 *     summary: Update a record's IsProcessed status
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personId
 *               - entryId
 *               - isProcessed
 *             properties:
 *               personId:
 *                 type: string
 *                 description: The unique person identifier
 *               entryId:
 *                 type: string
 *                 pattern: '^urn:uuid:[A-F0-9]{32}$'
 *                 description: The unique entry identifier in format urn:uuid:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 *               isProcessed:
 *                 type: boolean
 *                 description: The new processed status
 *           example:
 *             personId: "108"
 *             entryId: "urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9"
 *             isProcessed: true
 *     responses:
 *       200:
 *         description: Record processed status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Record processed status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/RecordResponse'
 *       400:
 *         description: Validation error - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Validation error"
 *               error: "personId, entryId, and isProcessed are required"
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Record not found"
 *               error: "No record found with the specified PersonId and EntryId"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/processed-status', cognitoAuth, validateUpdateProcessedStatus, updateRecordProcessedStatus);

/**
 * @swagger
 * /api/records/filter:
 *   get:
 *     summary: Get filtered records
 *     tags: [Records]
 *     description: Retrieves records filtered by feed, operation, status, and worker type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: feed
 *         schema:
 *           type: string
 *         description: Filter records by feed (e.g., "empassignment")
 *       - in: query
 *         name: operation
 *         schema:
 *           type: string
 *         description: Filter records by operation type (e.g., "INSERT", "UPDATE", "DELETE")
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter records by processing status (true or false)
 *       - in: query
 *         name: worker
 *         schema:
 *           type: string
 *         description: Filter records by worker type (e.g., "EMP")
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of records to return
 *       - in: query
 *         name: nextToken
 *         schema:
 *           type: string
 *         description: Pagination token for the next page
 *     responses:
 *       200:
 *         description: Successfully retrieved filtered records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecordResponse'
 *                   description: List of filtered records
 *                 count:
 *                   type: integer
 *                   description: Number of records returned
 *                 nextToken:
 *                   type: string
 *                   description: Token for retrieving the next page of results
 *             example:
 *               items:
 *                 - Feed: "empassignment"
 *                   EntryId: "urn:uuid:20AFAB82553F46D8A2E79A71356BB3A9"
 *                   DMLOperation: "INSERT"
 *                   IsProcessed: false
 *                   WorkerType: "EMP"
 *                   PublishedDateTime: "2025-03-26T09:43:39.137Z"
 *                   ProcessedMessage: "Initial record creation"
 *                   PersonId: "108"
 *                   ConstantKey: "Constant"
 *                   UpdatedDateTime: "2025-03-26T09:43:39.137Z"
 *               count: 1
 *               nextToken: "base64EncodedToken"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/filter', cognitoAuth, getFilteredRecords);

module.exports = router; 