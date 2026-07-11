/**
 * User Model
 * 
 * Authentication and authorization for the HR system.
 * Supports role-based access (Admin, HR Manager, Employee).
 * Passwords are hashed using bcryptjs before storage.
 * 
 * @module models/User
 */
const bcrypt = require('bcryptjs');

'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Links user to an employee record (nullable for admin-only accounts)',
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
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      role: {
        type: DataTypes.ENUM('admin', 'hr_manager', 'employee'),
        defaultValue: 'employee',
        allowNull: false,
        validate: {
          isIn: {
            args: [['admin', 'hr_manager', 'employee']],
            msg: 'Role must be one of: admin, hr_manager, employee',
          },
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Stores current refresh token for invalidation',
      },
      // Soft delete (though users are rarely deleted, can be deactivated)
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] },
        { fields: ['employee_id'] },
        { fields: ['is_active'] },
      ],
      hooks: {
        // Hash password before creating or updating
        beforeCreate: async (user) => {
          if (user.password_hash) {
            user.password_hash = await User.hashPassword(user.password_hash);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password_hash')) {
            user.password_hash = await User.hashPassword(user.password_hash);
          }
        },
      },
      defaultScope: {
        attributes: { exclude: ['password_hash', 'refresh_token'] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ['password_hash', 'refresh_token'] },
        },
      },
    }
  );

  /**
   * Hash a plain text password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  User.hashPassword = async function (password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  /**
   * Compare a plain text password against the stored hash
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} Whether password matches
   */
  User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password_hash);
  };

  /**
   * Return a safe user object (no sensitive fields)
   * @returns {Object} Sanitized user data
   */
  User.prototype.toSafeObject = function () {
    const values = this.get({ plain: true });
    delete values.password_hash;
    delete values.refresh_token;
    return values;
  };

  return User;
};
