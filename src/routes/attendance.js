/**
 * Attendance Routes
 * 
 * Attendance tracking with check-in/check-out, live dashboard, and reporting.
 * 
 * @module routes/attendance
 * 
 * Endpoints:
 * POST  /api/v1/attendance/checkin   - Check-in (entry) - admin/hr_manager
 * POST  /api/v1/attendance/checkout  - Check-out (exit) - admin/hr_manager
 * GET   /api/v1/attendance/live      - Live dashboard (who's in/out) - authenticated
 * GET   /api/v1/attendance           - List records with filters - authenticated
 * GET   /api/v1/attendance/stats     - Attendance statistics - authenticated
 */
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// All attendance routes require authentication
router.use(authenticate);

// Live dashboard (all authenticated users)
router.get('/live', attendanceController.getLiveStatus);

// Stats
router.get('/stats', attendanceController.getStats);

// List records with filters
router.get('/', validatePagination, attendanceController.list);

// Check-in/Check-out (admin and hr_manager)
router.post('/checkin', authorize('admin', 'hr_manager'), attendanceController.checkIn);
router.post('/checkout', authorize('admin', 'hr_manager'), attendanceController.checkOut);

module.exports = router;
