/**
 * Leave Management Routes
 * 
 * Complete leave request workflow including creation, approval/rejection,
 * cancellation, and balance tracking.
 * 
 * @module routes/leave
 * 
 * Endpoints:
 * GET    /api/v1/leaves                - List leave requests (authenticated)
 * GET    /api/v1/leaves/stats          - Leave statistics (authenticated)
 * GET    /api/v1/leaves/balance/:employeeId - Leave balances (authenticated)
 * GET    /api/v1/leaves/:id            - Get leave details (authenticated)
 * POST   /api/v1/leaves                - Create leave request (admin/hr_manager/employee)
 * PATCH  /api/v1/leaves/:id/approve    - Approve leave (admin/hr_manager)
 * PATCH  /api/v1/leaves/:id/reject     - Reject leave (admin/hr_manager)
 * PATCH  /api/v1/leaves/:id/cancel     - Cancel leave (owner or admin)
 */
const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validate');

// All leave routes require authentication
router.use(authenticate);

// Balance check (must be before /:id)
router.get('/balance/:employeeId', validateUUID('employeeId'), leaveController.getBalance);

// Stats
router.get('/stats', leaveController.getStats);

// Read routes (all authenticated users)
router.get('/', validatePagination, leaveController.list);
router.get('/:id', validateUUID('id'), leaveController.getById);

// Create leave request (all authenticated users can create their own)
router.post('/', leaveController.create);

// Approval workflow (admin and hr_manager only)
router.patch('/:id/approve', authorize('admin', 'hr_manager'), validateUUID('id'), leaveController.approve);
router.patch('/:id/reject', authorize('admin', 'hr_manager'), validateUUID('id'), leaveController.reject);

// Cancel (owner or admin)
router.patch('/:id/cancel', authorize('admin', 'hr_manager'), validateUUID('id'), leaveController.cancel);

module.exports = router;
