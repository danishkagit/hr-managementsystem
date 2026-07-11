/**
 * LeaveRequest Model
 * 
 * Manages employee leave requests with a full approval workflow.
 * Supports multiple leave types and tracks remaining balances.
 * 
 * @module models/LeaveRequest
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const LeaveRequest = sequelize.define(
    'LeaveRequest',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Employee ID is required' },
        },
      },
      leave_type: {
        type: DataTypes.ENUM(
          'annual',       // Paid annual leave
          'sick',         // Medical / sick leave
          'personal',     // Personal / casual leave
          'maternity',    // Maternity leave
          'paternity',    // Paternity leave
          'bereavement',  // Bereavement leave
          'unpaid',       // Leave without pay
          'other'         // Other types
        ),
        allowNull: false,
        validate: {
          isIn: {
            args: [['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other']],
            msg: 'Invalid leave type',
          },
        },
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: 'Valid start date is required' },
        },
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: 'Valid end date is required' },
          isAfterStart(value) {
            if (new Date(value) < new Date(this.start_date)) {
              throw new Error('End date must be on or after start date');
            }
          },
        },
      },
      total_days: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [0.5], msg: 'Minimum leave is 0.5 day' },
          max: { args: [365], msg: 'Maximum leave cannot exceed 365 days' },
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Reason is required' },
          len: {
            args: [10, 2000],
            msg: 'Reason must be between 10 and 2000 characters',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'approved', 'rejected', 'cancelled']],
            msg: 'Invalid leave status',
          },
        },
      },
      approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID of the approver',
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the decision was made',
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_half_day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      contact_during_leave: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // Soft delete
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'leave_requests',
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { fields: ['employee_id'] },
        { fields: ['status'] },
        { fields: ['start_date', 'end_date'] },
        { fields: ['employee_id', 'status'] },
        { fields: ['leave_type'] },
      ],
      hooks: {
        beforeValidate: (leave) => {
          // Auto-calculate total days
          if (leave.start_date && leave.end_date) {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            leave.total_days = leave.is_half_day ? 0.5 : diffDays;
          }
        },
      },
    }
  );

  /**
   * Default leave balances (per year) for different leave types
   */
  LeaveRequest.LEAVE_BALANCES = {
    annual: 20,
    sick: 12,
    personal: 5,
    maternity: 180,
    paternity: 15,
    bereavement: 5,
    unpaid: 0,
    other: 0,
  };

  /**
   * Get remaining leave balance for an employee
   * @param {string} employeeId - Employee UUID
   * @param {string} year - Year to check (defaults to current year)
   * @returns {Promise<Object>} Balance per leave type
   */
  LeaveRequest.getBalance = async function (employeeId, year) {
    const targetYear = year || new Date().getFullYear().toString();
    const startOfYear = `${targetYear}-01-01`;
    const endOfYear = `${targetYear}-12-31`;

    const results = await this.findAll({
      attributes: [
        'leave_type',
        [sequelize.fn('SUM', sequelize.col('total_days')), 'used_days'],
      ],
      where: {
        employee_id: employeeId,
        status: 'approved',
        start_date: { [sequelize.Sequelize.Op.between]: [startOfYear, endOfYear] },
      },
      group: ['leave_type'],
      raw: true,
    });

    const balances = {};
    for (const [type, total] of Object.entries(LeaveRequest.LEAVE_BALANCES)) {
      const used = results.find((r) => r.leave_type === type);
      balances[type] = {
        total: total,
        used: used ? parseFloat(used.used_days) : 0,
        remaining: total - (used ? parseFloat(used.used_days) : 0),
      };
    }

    return balances;
  };

  /**
   * Approve a leave request
   * @param {string} userId - Approver's user ID
   * @returns {Promise<LeaveRequest>}
   */
  LeaveRequest.prototype.approve = async function (userId) {
    this.status = 'approved';
    this.approved_by = userId;
    this.approved_at = new Date();
    return this.save();
  };

  /**
   * Reject a leave request
   * @param {string} userId - Approver's user ID
   * @param {string} reason - Reason for rejection
   * @returns {Promise<LeaveRequest>}
   */
  LeaveRequest.prototype.reject = async function (userId, reason) {
    this.status = 'rejected';
    this.approved_by = userId;
    this.approved_at = new Date();
    this.rejection_reason = reason || null;
    return this.save();
  };

  /**
   * Cancel a leave request (only if still pending)
   * @returns {Promise<LeaveRequest>}
   */
  LeaveRequest.prototype.cancel = async function () {
    if (this.status !== 'pending') {
      throw new Error('Only pending leave requests can be cancelled');
    }
    this.status = 'cancelled';
    return this.save();
  };

  return LeaveRequest;
};
