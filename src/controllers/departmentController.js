/**
 * Department Controller
 * 
 * CRUD operations for departments with pagination, search, and employee counts.
 * 
 * @module controllers/departmentController
 */
const { Department, Employee } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

/**
 * GET /api/v1/departments
 * List all departments with pagination and optional search
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { search, is_active } = req.query;

    const where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const { count, rows } = await Department.findAndCountAll({
      where,
      include: [
        {
          association: 'employees',
          attributes: ['id', 'first_name', 'last_name', 'status'],
          where: { status: 'active' },
          required: false,
        },
      ],
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        departments: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/departments/:id
 * Get a single department by ID
 */
const getById = async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [
        {
          association: 'employees',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation', 'status', 'email'],
        },
      ],
    });

    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/departments
 * Create a new department
 */
const create = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
    });

    // Broadcast real-time event
    getIO().emit('department:created', { department });

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/departments/:id
 * Update an existing department
 */
const update = async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    const { name, code, description, is_active } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code.toUpperCase();
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    await department.update(updates);

    // Broadcast real-time event
    getIO().emit('department:updated', { department });

    res.json({
      success: true,
      message: 'Department updated successfully.',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/departments/:id
 * Soft-delete a department
 */
const remove = async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    // Check if department has active employees
    const employeeCount = await Employee.count({
      where: { department_id: department.id, status: 'active' },
    });

    if (employeeCount > 0) {
      throw new AppError(
        `Cannot delete department with ${employeeCount} active employee(s). Reassign employees first.`,
        409,
        'DEPARTMENT_HAS_EMPLOYEES'
      );
    }

    await department.destroy();

    // Broadcast real-time event
    getIO().emit('department:deleted', { departmentId: department.id });

    res.json({
      success: true,
      message: 'Department deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getById, create, update, remove };
