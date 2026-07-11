/**
 * Employee Model
 * 
 * Central entity representing employees within the organization.
 * Supports onboarding (entry), offboarding (exit), manager hierarchy,
 * department association, and soft-delete via paranoid mode.
 * 
 * @module models/Employee
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    'Employee',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Employee code is required' },
        },
        comment: 'Unique employee identifier (e.g., EMP-0001)',
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Department is required' },
        },
      },
      manager_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'References another employee who is the manager',
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'First name is required' },
          len: { args: [1, 100], msg: 'First name must be 1-100 characters' },
        },
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Last name is required' },
          len: { args: [1, 100], msg: 'Last name must be 1-100 characters' },
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email is required' },
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
          is: {
            args: /^\+?[\d\s\-()]{7,20}$/,
            msg: 'Invalid phone number format',
          },
        },
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      employment_type: {
        type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern', 'temporary'),
        defaultValue: 'full_time',
      },
      status: {
        type: DataTypes.ENUM('active', 'on_leave', 'exited', 'suspended'),
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'on_leave', 'exited', 'suspended']],
            msg: 'Invalid employee status',
          },
        },
      },
      joined_at: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: 'Valid join date is required' },
          isPastOrToday(value) {
            if (new Date(value) > new Date()) {
              throw new Error('Join date cannot be in the future');
            }
          },
        },
      },
      exited_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when employee left the organization',
      },
      exit_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_contact_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      emergency_contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      // Soft delete
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'employees',
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['employee_code'] },
        { unique: true, fields: ['email'] },
        { fields: ['department_id'] },
        { fields: ['manager_id'] },
        { fields: ['status'] },
        { fields: ['is_active'] },
      ],
      hooks: {
        beforeCreate: (employee) => {
          // Auto-generate employee code if not provided
          if (!employee.employee_code) {
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            employee.employee_code = `EMP-${timestamp}${random}`;
          }
        },
      },
    }
  );

  /**
   * Get the employee's full name
   * @returns {string} Full name
   */
  Employee.prototype.fullName = function () {
    return `${this.first_name} ${this.last_name}`;
  };

  /**
   * Onboard a new employee (creates initial attendance state)
   * This is a convenience method for controller use
   */
  Employee.prototype.onboard = async function () {
    this.status = 'active';
    this.is_active = true;
    return this.save();
  };

  /**
   * Offboard an employee (soft exit)
   * @param {string} reason - Reason for offboarding
   * @param {Date} exitDate - Date of exit (defaults to today)
   */
  Employee.prototype.offboard = async function (reason, exitDate) {
    this.status = 'exited';
    this.is_active = false;
    this.exited_at = exitDate || new Date().toISOString().split('T')[0];
    this.exit_reason = reason || null;
    return this.save();
  };

  return Employee;
};
