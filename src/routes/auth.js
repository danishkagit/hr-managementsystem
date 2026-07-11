/**
 * Auth Routes
 * 
 * Authentication and user management endpoints.
 * 
 * @module routes/auth
 * 
 * Endpoints:
 * POST   /api/v1/auth/login       - Authenticate user
 * POST   /api/v1/auth/register    - Register new user (admin only)
 * POST   /api/v1/auth/refresh     - Refresh access token
 * POST   /api/v1/auth/logout      - Invalidate refresh token
 * GET    /api/v1/auth/me          - Get current user profile
 * PATCH  /api/v1/auth/password    - Change password
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/register', authenticate, authorize('admin'), authController.register);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.patch('/password', authenticate, authController.changePassword);

module.exports = router;
