/**
 * Department Routes
 * 
 * CRUD operations for departments.
 * 
 * @module routes/department
 * 
 * Endpoints:
 * GET    /api/v1/departments        - List departments (authenticated)
 * GET    /api/v1/departments/:id    - Get department details (authenticated)
 * POST   /api/v1/departments        - Create department (admin/hr_manager)
 * PATCH  /api/v1/departments/:id    - Update department (admin/hr_manager)
 * DELETE /api/v1/departments/:id    - Delete department (admin only)
 */
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validate');

// All department routes require authentication
router.use(authenticate);

// Read routes (all authenticated users)
router.get('/', validatePagination, departmentController.list);
router.get('/:id', validateUUID('id'), departmentController.getById);

// Write routes (admin and hr_manager)
router.post('/', authorize('admin', 'hr_manager'), departmentController.create);
router.patch('/:id', authorize('admin', 'hr_manager'), validateUUID('id'), departmentController.update);

// Delete routes (admin only)
router.delete('/:id', authorize('admin'), validateUUID('id'), departmentController.remove);

module.exports = router;
