/**
 * Leave Controller
 * 
 * Full leave management workflow: request creation, approval/rejection,
 * cancellation, balance tracking, and reporting.
 * 
 * @module controllers/leaveController
 */
const { LeaveRequest, Employee, User } = require('../models');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

/**
 * POST /api/v1/leaves
 * Create a new leave request
 */
const create = async (req, res, next) => {
  try {
    const {
      employee_id, leave_type, start_date, end_date,
      reason, is_half_day, contact_during_leave,
    } = req.body;

    // Validate employee
    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (employee.status === 'exited') {
      throw new AppError('Cannot request leave for an exited employee.', 400, 'EMPLOYEE_EXITED');
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      where: {
        employee_id,
        status: ['pending', 'approved'],
        start_date: { [Op.lte]: end_date },
        end_date: { [Op.gte]: start_date },
      },
    });

    if (overlapping) {
      throw new AppError(
        'Employee already has a pending or approved leave request overlapping these dates.',
        409,
        'OVERLAPPING_LEAVE'
      );
    }

    const leaveRequest = await LeaveRequest.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      is_half_day: is_half_day || false,
      contact_during_leave,
    });

    // Fetch complete record
    const record = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        {
          association: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
          include: [{ association: 'department', attributes: ['name'] }],
        },
      ],
    });

    // Broadcast real-time event
    getIO().emit('leave:created', { leaveRequest: record });

    logger.info(`Leave requested: ${employee.fullName()} - ${leave_type} (${start_date} to ${end_date})`);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: { leaveRequest: record },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/leaves
 * List leave requests with filtering
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { employee_id, status, leave_type, start_date, end_date } = req.query;

    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;
    if (leave_type) where.leave_type = leave_type;

    if (start_date && end_date) {
      where.start_date = { [Op.gte]: start_date };
      where.end_date = { [Op.lte]: end_date };
    }

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      include: [
        {
          association: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
          include: [{ association: 'department', attributes: ['name'] }],
        },
        {
          association: 'approver',
          attributes: ['id', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        leaveRequests: rows,
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
 * GET /api/v1/leaves/:id
 * Get a single leave request
 */
const getById = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        {
          association: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
          include: [{ association: 'department', attributes: ['name'] }],
        },
        {
          association: 'approver',
          attributes: ['id', 'email'],
        },
      ],
    });

    if (!leaveRequest) {
      throw new AppError('Leave request not found.', 404, 'LEAVE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { leaveRequest },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/leaves/:id/approve
 * Approve a pending leave request (HR Manager or Admin only)
 */
const approve = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{ association: 'employee' }],
    });

    if (!leaveRequest) {
      throw new AppError('Leave request not found.', 404, 'LEAVE_NOT_FOUND');
    }

    if (leaveRequest.status !== 'pending') {
      throw new AppError(
        `Cannot approve. Leave request is already ${leaveRequest.status}.`,
        400,
        'INVALID_LEAVE_STATUS'
      );
    }

    await leaveRequest.approve(req.user.id);

    // Update employee status to on_leave if approved
    const today = new Date().toISOString().split('T')[0];
    if (leaveRequest.start_date <= today && leaveRequest.end_date >= today) {
      await Employee.update(
        { status: 'on_leave' },
        { where: { id: leaveRequest.employee_id } }
      );
    }

    const updated = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { association: 'employee' },
        { association: 'approver', attributes: ['id', 'email'] },
      ],
    });

    // Broadcast real-time event
    getIO().emit('leave:approved', { leaveRequest: updated });

    logger.info(`Leave approved: ${leaveRequest.employee?.fullName()} - ${leaveRequest.leave_type}`);

    res.json({
      success: true,
      message: 'Leave request approved successfully.',
      data: { leaveRequest: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/leaves/:id/reject
 * Reject a pending leave request
 */
const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{ association: 'employee' }],
    });

    if (!leaveRequest) {
      throw new AppError('Leave request not found.', 404, 'LEAVE_NOT_FOUND');
    }

    if (leaveRequest.status !== 'pending') {
      throw new AppError(
        `Cannot reject. Leave request is already ${leaveRequest.status}.`,
        400,
        'INVALID_LEAVE_STATUS'
      );
    }

    await leaveRequest.reject(req.user.id, reason);

    const updated = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { association: 'employee' },
        { association: 'approver', attributes: ['id', 'email'] },
      ],
    });

    // Broadcast real-time event
    getIO().emit('leave:rejected', { leaveRequest: updated });

    logger.info(`Leave rejected: ${leaveRequest.employee?.fullName()} - ${leaveRequest.leave_type}`);

    res.json({
      success: true,
      message: 'Leave request rejected.',
      data: { leaveRequest: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/leaves/:id/cancel
 * Cancel a leave request
 */
const cancel = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{ association: 'employee' }],
    });

    if (!leaveRequest) {
      throw new AppError('Leave request not found.', 404, 'LEAVE_NOT_FOUND');
    }

    await leaveRequest.cancel();

    const updated = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { association: 'employee' },
        { association: 'approver', attributes: ['id', 'email'] },
      ],
    });

    // Broadcast real-time event
    getIO().emit('leave:cancelled', { leaveRequest: updated });

    res.json({
      success: true,
      message: 'Leave request cancelled.',
      data: { leaveRequest: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/leaves/balance/:employeeId
 * Get leave balance for an employee
 */
const getBalance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const balances = await LeaveRequest.getBalance(employeeId, year);

    res.json({
      success: true,
      data: {
        employeeId,
        employeeName: employee.fullName(),
        year: year || new Date().getFullYear().toString(),
        balances,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/leaves/stats
 * Get leave statistics
 */
const getStats = async (req, res, next) => {
  try {
    const { start_date, end_date, department_id } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.start_date = { [Op.gte]: start_date };
      where.end_date = { [Op.lte]: end_date };
    }

    const stats = await LeaveRequest.findAll({
      attributes: [
        'leave_type',
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('total_days')), 'total_days'],
      ],
      where,
      include: department_id ? [{
        association: 'employee',
        where: { department_id },
        attributes: [],
      }] : [],
      group: ['leave_type', 'status'],
      raw: true,
    });

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, getById, approve, reject, cancel, getBalance, getStats };
