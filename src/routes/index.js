/**
 * Routes Index
 * 
 * Aggregates all route modules and mounts them under the /api/v1 prefix.
 * When adding a NEW route group:
 *   1. Create the route file in this directory
 *   2. Add the require() and app.use() line below
 * 
 * @module routes/index
 */
const express = require('express');
const router = express.Router();

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Management System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/auth', require('./auth'));
router.use('/departments', require('./department'));
router.use('/employees', require('./employee'));
router.use('/attendance', require('./attendance'));
router.use('/leaves', require('./leave'));

module.exports = router;
