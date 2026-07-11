'use strict';

/**
 * Migration: Create attendance table
 * 
 * Tracks daily employee attendance with check-in/check-out times,
 * status flags, and work hours calculation.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendance', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_in_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      check_out_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'half_day', 'on_leave'),
        defaultValue: 'absent',
      },
      is_late: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      late_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      work_hours: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('attendance', ['employee_id', 'date'], {
      unique: true,
      name: 'idx_attendance_employee_date_unique',
    });
    await queryInterface.addIndex('attendance', ['employee_id'], {
      name: 'idx_attendance_employee',
    });
    await queryInterface.addIndex('attendance', ['date'], {
      name: 'idx_attendance_date',
    });
    await queryInterface.addIndex('attendance', ['status'], {
      name: 'idx_attendance_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('attendance');
  },
};
