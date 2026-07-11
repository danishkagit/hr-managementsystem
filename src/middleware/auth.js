/**
 * Authentication & Authorization Middleware
 * 
 * JWT-based authentication with role-based access control.
 * Provides middleware for protecting routes and checking user roles.
 * 
 * @module middleware/auth
 */
const jwt = require('jsonwebtoken');
const config = require('../config/server');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Role hierarchy for permission checking
 * Higher number = more privileges
 */
const ROLE_HIERARCHY = {
  employee: 1,
  hr_manager: 2,
  admin: 3,
};

/**
 * Verify JWT token from Authorization header
 * Attaches decoded user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Fetch user from database to ensure they still exist and are active
    const user = await User.scope('withPassword').findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Attach user info to request
    req.user = user.toSafeObject();
    req.user.roleLevel = ROLE_HIERARCHY[user.role] || 0;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error.',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Authorize based on required roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'hr_manager')
 * @returns {function} Express middleware
 * 
 * Usage: router.get('/path', authorize('admin', 'hr_manager'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        code: 'FORBIDDEN',
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Optional auth - attaches user if token is present, but doesn't block if missing
 * Useful for endpoints that behave differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.id);
      if (user && user.is_active) {
        req.user = user.toSafeObject();
        req.user.roleLevel = ROLE_HIERARCHY[user.role] || 0;
      }
    }
  } catch (error) {
    // Silently continue without user
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth, ROLE_HIERARCHY };
