/**
 * Employee Controller
 * 
 * Full CRUD operations for employees including onboarding (entry),
 * offboarding (exit), manager hierarchy management, and profile updates.
 * All changes broadcasted via WebSocket for real-time dashboards.
 * 
 * @module controllers/employeeController
 */
const { Employee, Department, User, Attendance, sequelize } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

/**
 * GET /api/v1/employees
 * List employees with pagination, search, and filtering
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { search, status, department_id, employment_type } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { employee_code: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    if (employment_type) where.employment_type = employment_type;

    const { count, rows } = await Employee.findAndCountAll({
      where,
      include: [
        { association: 'department', attributes: ['id', 'name', 'code'] },
        { association: 'manager', attributes: ['id', 'first_name', 'last_name', 'employee_code'] },
      ],
      order: [['joined_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        employees: rows,
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
 * GET /api/v1/employees/:id
 * Get a single employee with details
 */
const getById = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { association: 'department' },
        { association: 'manager', attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'] },
        { association: 'directReports', attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation', 'status'] },
        { association: 'user', attributes: ['id', 'email', 'role', 'is_active'] },
      ],
    });

    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/employees
 * Onboard a new employee (creates profile, optionally creates user account)
 */
const create = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone, department_id,
      designation, employment_type, joined_at, manager_id,
      date_of_birth, gender, address,
      emergency_contact_name, emergency_contact_phone,
    } = req.body;

    // Validate department exists
    const department = await Department.findByPk(department_id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    // Validate manager exists (if specified)
    if (manager_id) {
      const manager = await Employee.findByPk(manager_id);
      if (!manager) {
        throw new AppError('Manager not found.', 404, 'MANAGER_NOT_FOUND');
      }
    }

    const employee = await Employee.create({
      first_name,
      last_name,
      email: email.toLowerCase().trim(),
      phone,
      department_id,
      designation,
      employment_type: employment_type || 'full_time',
      joined_at: joined_at || new Date().toISOString().split('T')[0],
      manager_id: manager_id || null,
      date_of_birth,
      gender,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      status: 'active',
    });

    // Update department head count
    await Department.update(
      { head_count: sequelize.literal('head_count + 1') },
      { where: { id: department_id } }
    );

    // Fetch complete record with associations
    const newEmployee = await Employee.findByPk(employee.id, {
      include: [
        { association: 'department' },
        { association: 'manager', attributes: ['id', 'first_name', 'last_name', 'employee_code'] },
      ],
    });

    // Auto-create a user account for the employee
    try {
      await User.create({
        email: employee.email,
        password_hash: 'Welcome@123', // Default password - force change on first login
        role: 'employee',
        employee_id: employee.id,
      });
    } catch (userError) {
      logger.warn(`Could not auto-create user for ${employee.email}: ${userError.message}`);
    }

    // Broadcast real-time event
    getIO().emit('employee:created', { employee: newEmployee });

    res.status(201).json({
      success: true,
      message: 'Employee onboarded successfully. User account created with default password.',
      data: { employee: newEmployee },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/employees/:id
 * Update employee profile
 */
const update = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'designation',
      'employment_type', 'manager_id', 'date_of_birth',
      'gender', 'address', 'emergency_contact_name',
      'emergency_contact_phone',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle email separately (with validation)
    if (req.body.email) {
      updates.email = req.body.email.toLowerCase().trim();
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields provided for update.', 400, 'NO_UPDATES');
    }

    // If changing department, update head counts
    if (updates.department_id && updates.department_id !== employee.department_id) {
      const DepartmentModel = require('../models').Department;
      await DepartmentModel.decrement('head_count', { where: { id: employee.department_id } });
      await DepartmentModel.increment('head_count', { where: { id: updates.department_id } });
    }

    await employee.update(updates);

    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [
        { association: 'department' },
        { association: 'manager', attributes: ['id', 'first_name', 'last_name', 'employee_code'] },
      ],
    });

    // Broadcast real-time event
    getIO().emit('employee:updated', { employee: updatedEmployee });

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      data: { employee: updatedEmployee },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/employees/:id
 * Soft-delete an employee record
 */
const remove = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Don't allow deletion of employees with active attendance
    const activeAttendance = await Attendance.count({
      where: {
        employee_id: employee.id,
        check_out_time: null,
      },
    });

    if (activeAttendance > 0) {
      throw new AppError(
        'Employee has an active session. Please check them out first.',
        409,
        'HAS_ACTIVE_SESSION'
      );
    }

    await employee.destroy();

    // Broadcast real-time event
    getIO().emit('employee:deleted', { employeeId: employee.id });

    res.json({
      success: true,
      message: 'Employee record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/employees/:id/offboard
 * Offboard (exit) an employee
 */
const offboard = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (employee.status === 'exited') {
      throw new AppError('Employee has already been offboarded.', 400, 'ALREADY_OFFBOARDED');
    }

    const { reason, exit_date } = req.body;
    await employee.offboard(reason, exit_date);

    // Deactivate associated user account
    const user = await User.findOne({ where: { employee_id: employee.id } });
    if (user) {
      user.is_active = false;
      await user.save();
    }

    const offboardedEmployee = await Employee.findByPk(employee.id, {
      include: [{ association: 'department' }],
    });

    // Broadcast real-time event
    getIO().emit('employee:offboarded', { employee: offboardedEmployee });

    res.json({
      success: true,
      message: 'Employee offboarded successfully.',
      data: { employee: offboardedEmployee },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/employees/stats/summary
 * Get employee statistics (active count, by department, by status)
 */
const getStats = async (req, res, next) => {
  try {
    const totalActive = await Employee.count({ where: { status: 'active' } });
    const totalOnLeave = await Employee.count({ where: { status: 'on_leave' } });
    const totalExited = await Employee.count({ where: { status: 'exited' } });
    const totalSuspended = await Employee.count({ where: { status: 'suspended' } });

    // Get department-wise counts using raw query for compatibility
    const [byDepartment] = await sequelize.query(`
      SELECT d.id, d.name, d.code, COUNT(e.id)::int as count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL
      WHERE d.deleted_at IS NULL
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name ASC
    `);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalActive + totalOnLeave + totalExited + totalSuspended,
          active: totalActive,
          onLeave: totalOnLeave,
          exited: totalExited,
          suspended: totalSuspended,
        },
        byDepartment,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getById, create, update, remove, offboard, getStats };
