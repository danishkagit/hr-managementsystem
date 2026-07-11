/**
 * Employee Routes
 * 
 * Employee management including onboarding, offboarding, and profile updates.
 * 
 * @module routes/employee
 * 
 * Endpoints:
 * GET    /api/v1/employees            - List employees (authenticated)
 * GET    /api/v1/employees/stats      - Employee statistics (authenticated)
 * GET    /api/v1/employees/:id        - Get employee details (authenticated)
 * POST   /api/v1/employees            - Onboard new employee (admin/hr_manager)
 * PATCH  /api/v1/employees/:id        - Update employee (admin/hr_manager)
 * DELETE /api/v1/employees/:id        - Delete employee (admin only)
 * POST   /api/v1/employees/:id/offboard - Offboard employee (admin/hr_manager)
 */
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validate');

// All employee routes require authentication
router.use(authenticate);

// Stats (must be defined before /:id to avoid route conflict)
router.get('/stats', employeeController.getStats);

// Read routes (all authenticated users)
router.get('/', validatePagination, employeeController.list);
router.get('/:id', validateUUID('id'), employeeController.getById);

// Write routes (admin and hr_manager)
router.post('/', authorize('admin', 'hr_manager'), employeeController.create);
router.patch('/:id', authorize('admin', 'hr_manager'), validateUUID('id'), employeeController.update);

// Offboarding (admin and hr_manager)
router.post('/:id/offboard', authorize('admin', 'hr_manager'), validateUUID('id'), employeeController.offboard);

// Delete routes (admin only)
router.delete('/:id', authorize('admin'), validateUUID('id'), employeeController.remove);

module.exports = router;
