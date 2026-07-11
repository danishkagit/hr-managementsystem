'use strict';

/**
 * Migration: Create departments table
 * 
 * Creates the departments table with UUID primary key,
 * unique name/code fields, and soft-delete support.
 * 
 * To add a NEW column to this table:
 *   DO NOT edit this migration. Create a new migration file
 *   named like: YYYYMMDDHHMMSS-add-column-to-departments.js
 * 
 * Example:
 *   module.exports = {
 *     up: (queryInterface, Sequelize) => {
 *       return queryInterface.addColumn('departments', 'budget', {
 *         type: Sequelize.DECIMAL(12, 2),
 *         allowNull: true,
 *       });
 *     },
 *     down: (queryInterface) => {
 *       return queryInterface.removeColumn('departments', 'budget');
 *     },
 *   };
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('departments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      head_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('departments', ['name'], {
      unique: true,
      name: 'idx_departments_name_unique',
    });
    await queryInterface.addIndex('departments', ['code'], {
      unique: true,
      name: 'idx_departments_code_unique',
    });
    await queryInterface.addIndex('departments', ['is_active'], {
      name: 'idx_departments_is_active',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('departments');
  },
};
