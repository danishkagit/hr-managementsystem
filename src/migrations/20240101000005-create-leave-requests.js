'use strict';

/**
 * Migration: Create leave_requests table
 * 
 * Leave management with full approval workflow,
 * multiple leave types, and balance tracking.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leave_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      leave_type: {
        type: Sequelize.ENUM(
          'annual', 'sick', 'personal', 'maternity',
          'paternity', 'bereavement', 'unpaid', 'other'
        ),
        allowNull: false,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      total_days: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 1,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending',
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_half_day: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      contact_during_leave: {
        type: Sequelize.STRING(100),
        allowNull: true,
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
    await queryInterface.addIndex('leave_requests', ['employee_id'], {
      name: 'idx_leave_requests_employee',
    });
    await queryInterface.addIndex('leave_requests', ['status'], {
      name: 'idx_leave_requests_status',
    });
    await queryInterface.addIndex('leave_requests', ['employee_id', 'status'], {
      name: 'idx_leave_requests_employee_status',
    });
    await queryInterface.addIndex('leave_requests', ['leave_type'], {
      name: 'idx_leave_requests_type',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop enums used by this table
    await queryInterface.dropTable('leave_requests');
  },
};
