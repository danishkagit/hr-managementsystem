/**
 * Attendance Model
 * 
 * Tracks daily check-in and check-out events for employees.
 * Each record represents a single day's attendance with entry/exit timestamps.
 * Supports real-time broadcasting via Socket.IO on status changes.
 * 
 * @module models/Attendance
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define(
    'Attendance',
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: { msg: 'Valid date is required' },
        },
      },
      check_in_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of check-in (entry)',
      },
      check_out_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of check-out (exit)',
      },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'on_leave'),
        defaultValue: 'absent',
        validate: {
          isIn: {
            args: [['present', 'absent', 'late', 'half_day', 'on_leave']],
            msg: 'Invalid attendance status',
          },
        },
      },
      is_late: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flagged if check-in time is after the allowed threshold',
      },
      late_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of minutes late (if applicable)',
      },
      work_hours: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Work hours cannot be negative' },
          max: { args: [24], msg: 'Work hours cannot exceed 24' },
        },
        comment: 'Total working hours for the day',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Soft delete
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'attendance',
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['employee_id', 'date'], msg: 'Only one attendance record per employee per day' },
        { fields: ['employee_id'] },
        { fields: ['date'] },
        { fields: ['status'] },
        { fields: ['date', 'status'] },
      ],
      hooks: {
        beforeSave: (attendance) => {
          // Auto-calculate work hours when both check-in and check-out are present
          if (attendance.check_in_time && attendance.check_out_time) {
            const checkIn = new Date(attendance.check_in_time);
            const checkOut = new Date(attendance.check_out_time);
            const diffMs = checkOut - checkIn;
            
            if (diffMs > 0) {
              const hours = diffMs / (1000 * 60 * 60);
              attendance.work_hours = Math.round(hours * 100) / 100; // Round to 2 decimals
            }
          }
        },
      },
    }
  );

  /**
   * Check-in an employee for the current day
   * Creates or updates the attendance record with check-in time
   * @param {string} employeeId - Employee UUID
   * @param {object} options - Additional options (late threshold in minutes, notes)
   * @returns {Promise<Attendance>}
   */
  Attendance.checkIn = async function (employeeId, options = {}) {
    const today = new Date().toISOString().split('T')[0];
    const lateThreshold = options.lateThreshold || 15; // minutes after 9:00 AM

    let record = await this.findOne({
      where: { employee_id: employeeId, date: today },
    });

    const now = new Date();
    
    if (record) {
      // Already checked in - update time if needed
      if (!record.check_in_time) {
        record.check_in_time = now;
        record.status = 'present';
        record.is_late = false;
        record.late_minutes = 0;

        // Determine if late (assuming 9:00 AM start)
        const startHour = 9; // 9:00 AM
        const startMinute = 0;
        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        
        if (now > startTime) {
          const lateMs = now - startTime;
          const lateMins = Math.round(lateMs / 60000);
          if (lateMins > lateThreshold) {
            record.is_late = true;
            record.late_minutes = lateMins;
            record.status = 'late';
          }
        }

        if (options.notes) record.notes = options.notes;
        await record.save();
      }
      return record;
    }

    // Create new attendance record
    record = await this.create({
      employee_id: employeeId,
      date: today,
      check_in_time: now,
      status: 'present',
      notes: options.notes || null,
    });

    return record;
  };

  /**
   * Check-out an employee for the current day
   * Updates the existing attendance record with check-out time
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Attendance>}
   */
  Attendance.checkOut = async function (employeeId) {
    const today = new Date().toISOString().split('T')[0];

    const record = await this.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (!record) {
      const err = new Error('No check-in record found for today. Please check-in first.');
      err.statusCode = 400;
      throw err;
    }

    if (record.check_out_time) {
      const err = new Error('Already checked out today.');
      err.statusCode = 400;
      throw err;
    }

    record.check_out_time = new Date();
    await record.save();

    return record;
  };

  /**
   * Get currently checked-in employees (active today)
   * @returns {Promise<Array>} Array of active attendance records with employee data
   */
  Attendance.getActiveSessions = async function () {
    const today = new Date().toISOString().split('T')[0];
    
    const records = await this.findAll({
      where: {
        date: today,
        check_in_time: { [sequelize.Sequelize.Op.ne]: null },
        check_out_time: null,
      },
      include: [{
        association: 'employee',
        include: [{
          association: 'department',
        }],
      }],
      order: [['check_in_time', 'DESC']],
    });

    return records.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee ? r.employee.fullName() : 'Unknown',
      employeeCode: r.employee ? r.employee.employee_code : 'N/A',
      department: r.employee && r.employee.department ? r.employee.department.name : 'N/A',
      designation: r.employee ? r.employee.designation : 'N/A',
      checkInTime: r.check_in_time,
      workHours: r.work_hours,
      isLate: r.is_late,
      lateMinutes: r.late_minutes,
    }));
  };

  return Attendance;
};
