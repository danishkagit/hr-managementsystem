/**
 * HR Management System - Main Server Entry Point
 * 
 * Production-grade Express server with PostgreSQL backend,
 * JWT authentication, Socket.IO real-time updates, and
 * comprehensive middleware stack.
 * 
 * @module server
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/server');
const logger = require('./utils/logger');
const { sequelize } = require('./models');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./sockets');
const swaggerSpec = require('./config/swagger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------
// MIDDLEWARE STACK
// ---------------------------------------------------------------

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// CORS
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ---------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------

// Swagger API documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'HR Management System - API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// API v1 routes
app.use('/api/v1', require('./routes'));

// Health check (top-level)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Management System is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Track database connection state for health checks
let dbConnected = false;

// ---------------------------------------------------------------
// DATABASE & SERVER INITIALIZATION
// ---------------------------------------------------------------

const startServer = async () => {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    dbConnected = true;
    logger.info('✓ PostgreSQL database connection established');

    // Initialize Socket.IO
    initSocket(server);

    // Start server
    server.listen(config.port, config.host, () => {
      logger.info('══════════════════════════════════════════════');
      logger.info(`  HR Management System v1.0.0`);
      logger.info(`  Environment: ${config.env.toUpperCase()}`);
      logger.info(`  Server:      http://${config.host}:${config.port}`);
      logger.info(`  API:         http://${config.host}:${config.port}/api/v1`);
      logger.info(`  WebSocket:   ${config.host}:${config.port}${config.ws.path}`);
      logger.info(`  Database:    ${process.env.DB_NAME || 'hr_management'}@${process.env.DB_HOST || 'localhost'}`);
      logger.info('══════════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
  });

  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error) {
    logger.error('Error closing database:', error);
  }

  process.exit(0);
};

// Start the server
startServer();

module.exports = { app, server };
