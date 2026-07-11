/**
 * Department Model
 * 
 * Represents organizational departments within the company.
 * Departments have a hierarchical structure and can be soft-deleted.
 * 
 * @module models/Department
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    'Department',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Department name is required' },
          len: {
            args: [2, 100],
            msg: 'Department name must be 2-100 characters',
          },
        },
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Department code is required' },
          is: {
            args: /^[A-Z0-9_]+$/,
            msg: 'Code must be uppercase alphanumeric with underscores only',
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      head_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of employees in this department (denormalized)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      // Soft delete fields handled by paranoid: true
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'departments',
      timestamps: true,
      paranoid: true,     // Soft deletes enabled
      underscored: true,
      indexes: [
        { unique: true, fields: ['name'] },
        { unique: true, fields: ['code'] },
        { fields: ['is_active'] },
      ],
    }
  );

  return Department;
};
