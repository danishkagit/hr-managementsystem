/**
 * Test App Helper
 *
 * Creates an isolated Express app instance for testing,
 * without starting the server or connecting to a real database.
 * Useful for testing middleware, route handlers, and API contracts.
 *
 * @module tests/helpers/testApp
 */
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const config = require('../../src/config/server');
const routes = require('../../src/routes');
const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');
const swaggerSpec = require('../../src/config/swagger');

/**
 * Build a lightweight Express app without DB dependency
 * for testing route contracts, auth middleware, and error handling.
 */
function buildTestApp() {
  const app = express();

  // Core middleware
  app.use(cors(config.cors));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiter (high limit for tests)
  const limiter = rateLimit({
    windowMs: 60000,
    max: 1000,
    message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Swagger docs
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'HR Management System - API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // API routes
  app.use('/api/v1', routes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'HR Management System is operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  // 404 and error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildTestApp };
