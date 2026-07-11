/**
 * Test Setup
 *
 * Prepares the test environment before any tests run.
 * Sets environment variables and handles DB connection setup.
 *
 * @module tests/helpers/setup
 */
const path = require('path');

// Set test environment before any module loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.LOG_LEVEL = 'silent';
process.env.RATE_LIMIT_MAX = '1000'; // High limit to avoid hitting during tests

// Set DB to test database
process.env.DB_NAME = process.env.DB_NAME || 'hr_management_test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
