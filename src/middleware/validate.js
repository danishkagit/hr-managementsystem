/**
 * Request Validation Middleware
 * 
 * Provides reusable validation middleware for common request patterns.
 * Ensures request bodies contain required fields and valid data types.
 * 
 * @module middleware/validate
 */
const { AppError } = require('./errorHandler');

/**
 * Validate that required fields exist in request body
 * @param {string[]} fields - Array of required field names
 * @returns {function} Express middleware
 */
const requireFields = (fields) => {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new AppError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'MISSING_FIELDS'
      );
    }

    next();
  };
};

/**
 * Validate that request body contains at least one of the specified fields
 * @param {string[]} fields - Array of field names (at least one required)
 * @returns {function} Express middleware
 */
const requireAtLeastOne = (fields) => {
  return (req, res, next) => {
    const hasOne = fields.some(
      (field) => req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== ''
    );

    if (!hasOne) {
      throw new AppError(
        `At least one of these fields is required: ${fields.join(', ')}`,
        400,
        'MINIMUM_FIELDS'
      );
    }

    next();
  };
};

/**
 * Validate a UUID parameter
 * @param {string} paramName - Name of the URL parameter
 * @returns {function} Express middleware
 */
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const value = req.params[paramName];

    if (!value || !uuidRegex.test(value)) {
      throw new AppError(
        `Invalid ${paramName} format. Expected UUID.`,
        400,
        'INVALID_UUID'
      );
    }

    next();
  };
};

/**
 * Validate pagination query parameters
 */
const validatePagination = (req, res, next) => {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 20;
  let offset = (page - 1) * limit;

  // Enforce limits
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;

  req.pagination = { page, limit, offset };
  next();
};

/**
 * Validate date range query parameters
 * @param {string} startParam - Query param name for start date
 * @param {string} endParam - Query param name for end date
 * @returns {function} Express middleware
 */
const validateDateRange = (startParam = 'start_date', endParam = 'end_date') => {
  return (req, res, next) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (req.query[startParam] && !dateRegex.test(req.query[startParam])) {
      throw new AppError(
        `Invalid date format for ${startParam}. Use YYYY-MM-DD.`,
        400,
        'INVALID_DATE'
      );
    }

    if (req.query[endParam] && !dateRegex.test(req.query[endParam])) {
      throw new AppError(
        `Invalid date format for ${endParam}. Use YYYY-MM-DD.`,
        400,
        'INVALID_DATE'
      );
    }

    if (req.query[startParam] && req.query[endParam]) {
      if (new Date(req.query[endParam]) < new Date(req.query[startParam])) {
        throw new AppError(
          `${endParam} must be after ${startParam}.`,
          400,
          'INVALID_DATE_RANGE'
        );
      }
    }

    next();
  };
};

module.exports = {
  requireFields,
  requireAtLeastOne,
  validateUUID,
  validatePagination,
  validateDateRange,
};
