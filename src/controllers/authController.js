/**
 * Auth Controller
 * 
 * Handles user authentication: login, registration, token refresh, logout,
 * and profile management.
 * 
 * @module controllers/authController
 */
const jwt = require('jsonwebtoken');
const { User, Employee } = require('../models');
const config = require('../config/server');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400, 'MISSING_CREDENTIALS');
    }

    // Find user with password scope
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation', 'department_id'] }],
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.is_active) {
      throw new AppError('Account has been deactivated. Contact administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token hash in DB for invalidation
    user.refresh_token = refreshToken;
    user.last_login_at = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toSafeObject(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/register
 * Register a new user account (admin only)
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, role, employee_id } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      throw new AppError('Email already registered.', 409, 'EMAIL_EXISTS');
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password_hash: password,
      role: role || 'employee',
      employee_id: employee_id || null,
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Refresh the access token using a valid refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Verify the refresh token
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Find user and verify token matches stored token
    const user = await User.scope('withPassword').findByPk(decoded.id);
    if (!user || !user.is_active || user.refresh_token !== token) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Generate new tokens
    const accessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update stored refresh token
    user.refresh_token = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Invalidate the current refresh token
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (user) {
      user.refresh_token = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          association: 'employee',
          include: [{ association: 'department' }],
        },
      ],
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/auth/password
 * Change the current user's password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required.', 400, 'MISSING_FIELDS');
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters.', 400, 'WEAK_PASSWORD');
    }

    const user = await User.scope('withPassword').findByPk(req.user.id);
    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      throw new AppError('Current password is incorrect.', 401, 'INCORRECT_PASSWORD');
    }

    user.password_hash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};
