/**
 * Attendance Controller
 * 
 * Handles daily attendance operations: check-in (entry), check-out (exit),
 * live dashboard of who's currently in/out, and attendance reporting.
 * All real-time events are broadcast via Socket.IO.
 * 
 * @module controllers/attendanceController
 */
const { Attendance, Employee, Department } = require('../models');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

/**
 * POST /api/v1/attendance/checkin
 * Record employee check-in (entry) for the current day
 */
const checkIn = async (req, res, next) => {
  try {
    const { employee_id, notes } = req.body;

    if (!employee_id) {
      throw new AppError('Employee ID is required.', 400, 'MISSING_EMPLOYEE_ID');
    }

    // Verify employee exists and is active
    const employee = await Employee.findByPk(employee_id, {
      include: [{ association: 'department' }],
    });

    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (employee.status !== 'active') {
      throw new AppError(
        `Cannot check in. Employee status is: ${employee.status}`,
        400,
        'INVALID_EMPLOYEE_STATUS'
      );
    }

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await Attendance.findOne({
      where: { employee_id, date: today, check_out_time: null },
    });

    if (existingRecord) {
      throw new AppError(
        'Employee is already checked in today.',
        409,
        'ALREADY_CHECKED_IN'
      );
    }

    // Perform check-in
    const attendance = await Attendance.checkIn(employee_id, { notes });

    // Fetch complete record
    const record = await Attendance.findByPk(attendance.id, {
      include: [{
        association: 'employee',
        include: [{ association: 'department' }],
      }],
    });

    // Broadcast real-time check-in event
    getIO().emit('attendance:checkin', {
      attendance: record,
      employee: {
        id: employee.id,
        name: employee.fullName(),
        code: employee.employee_code,
        department: employee.department?.name || 'N/A',
      },
      timestamp: new Date(),
    });

    logger.info(`Check-in: ${employee.fullName()} (${employee.employee_code})`);

    res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully.',
      data: {
        attendance: record,
        status: record.is_late ? 'late' : 'on_time',
        lateMinutes: record.late_minutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/attendance/checkout
 * Record employee check-out (exit) for the current day
 */
const checkOut = async (req, res, next) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      throw new AppError('Employee ID is required.', 400, 'MISSING_EMPLOYEE_ID');
    }

    const employee = await Employee.findByPk(employee_id, {
      include: [{ association: 'department' }],
    });

    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Perform check-out
    const attendance = await Attendance.checkOut(employee_id);

    // Fetch complete record
    const record = await Attendance.findByPk(attendance.id, {
      include: [{
        association: 'employee',
        include: [{ association: 'department' }],
      }],
    });

    // Broadcast real-time check-out event
    getIO().emit('attendance:checkout', {
      attendance: record,
      employee: {
        id: employee.id,
        name: employee.fullName(),
        code: employee.employee_code,
        department: employee.department?.name || 'N/A',
      },
      timestamp: new Date(),
    });

    logger.info(`Check-out: ${employee.fullName()} (${employee.employee_code})`);

    res.json({
      success: true,
      message: 'Check-out recorded successfully.',
      data: {
        attendance: record,
        workHours: record.work_hours,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/live
 * Get currently checked-in employees (live dashboard data)
 * This is the primary endpoint for the "who's in/out" dashboard
 */
const getLiveStatus = async (req, res, next) => {
  try {
    const activeSessions = await Attendance.getActiveSessions();

    // Also get all active employees who are NOT checked in
    const checkedInIds = activeSessions.map((s) => s.employeeId);
    const activeEmployees = await Employee.findAll({
      where: { status: 'active' },
      include: [{ association: 'department', attributes: ['id', 'name', 'code'] }],
      attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation', 'status'],
    });

    const availableEmployees = activeEmployees.filter(
      (e) => !checkedInIds.includes(e.id)
    );

    res.json({
      success: true,
      data: {
        checkedIn: activeSessions,
        checkedInCount: activeSessions.length,
        availableEmployees,
        availableCount: availableEmployees.length,
        totalActive: activeEmployees.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance
 * Get attendance records with filtering
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { employee_id, start_date, end_date, status } = req.query;

    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{
        association: 'employee',
        include: [{ association: 'department', attributes: ['name'] }],
        attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
      }],
      order: [['date', 'DESC'], ['check_in_time', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        records: rows,
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
 * GET /api/v1/attendance/stats
 * Get attendance statistics for a date range
 */
const getStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      throw new AppError('Start date and end date are required.', 400, 'MISSING_DATE_RANGE');
    }

    const stats = await Attendance.findAll({
      attributes: [
        'date',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'present' THEN 1 ELSE 0 END")), 'present'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'late' THEN 1 ELSE 0 END")), 'late'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'absent' THEN 1 ELSE 0 END")), 'absent'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'half_day' THEN 1 ELSE 0 END")), 'half_day'],
        [Sequelize.fn('AVG', Sequelize.col('work_hours')), 'avg_work_hours'],
      ],
      where: {
        date: {
          [Sequelize.Op.between]: [start_date, end_date],
        },
      },
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true,
    });

    // Summary
    const summary = {
      totalRecords: stats.reduce((sum, s) => sum + parseInt(s.total, 10), 0),
      present: stats.reduce((sum, s) => sum + parseInt(s.present, 10), 0),
      late: stats.reduce((sum, s) => sum + parseInt(s.late, 10), 0),
      absent: stats.reduce((sum, s) => sum + parseInt(s.absent, 10), 0),
      halfDay: stats.reduce((sum, s) => sum + parseInt(s.half_day, 10), 0),
      avgWorkHours: stats.length > 0
        ? (stats.reduce((sum, s) => sum + parseFloat(s.avg_work_hours || 0), 0) / stats.length).toFixed(2)
        : '0.00',
    };

    res.json({
      success: true,
      data: { daily: stats, summary },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, getLiveStatus, list, getStats };
