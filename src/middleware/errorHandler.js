/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the entire application.
 * Catches all errors, logs them, and returns standardized JSON responses.
 * 
 * @module middleware/errorHandler
 */
const logger = require('../utils/logger');
const config = require('../config/server');

/**
 * Custom application error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Sequelize validation errors
 */
const handleValidationError = (err) => {
  const messages = err.errors?.map((e) => e.message) || [err.message];
  return new AppError(messages.join('; '), 400, 'VALIDATION_ERROR');
};

/**
 * Handle Sequelize unique constraint errors
 */
const handleUniqueConstraintError = (err) => {
  const field = err.errors?.[0]?.path || 'field';
  return new AppError(
    `A record with this ${field} already exists.`,
    409,
    'DUPLICATE_ENTRY'
  );
};

/**
 * Handle Sequelize foreign key constraint errors
 */
const handleForeignKeyError = (err) => {
  return new AppError(
    'Referenced record does not exist or cannot be deleted.',
    409,
    'FOREIGN_KEY_ERROR'
  );
};

/**
 * Handle JWT errors
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please login again.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Token expired. Please login again.', 401, 'TOKEN_EXPIRED');

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${req.method} ${req.originalUrl} - Error:`, {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode || 500,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  // Default error state
  let error = { ...err };
  error.message = err.message;
  error.code = err.code || 'INTERNAL_ERROR';
  error.statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeValidationError') {
    error = handleValidationError(err);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    error = handleUniqueConstraintError(err);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = handleForeignKeyError(err);
  }

  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  if (err.name === 'SequelizeDatabaseError') {
    error = new AppError(
      'A database error occurred. Please check your request.',
      400,
      'DATABASE_ERROR'
    );
  }

  // Build response
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
    code: error.code,
  };

  // Add validation details if available
  if (err.errors && Array.isArray(err.errors)) {
    response.details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Add stack trace in development
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 handler for unknown routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
};

module.exports = { errorHandler, notFoundHandler, AppError };
