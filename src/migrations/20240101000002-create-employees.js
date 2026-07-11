'use strict';

/**
 * Migration: Create employees table
 * 
 * Core employees table with manager hierarchy, department FK,
 * onboarding/offboarding data, and soft-delete support.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('employees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'departments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      manager_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      designation: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      employment_type: {
        type: Sequelize.ENUM('full_time', 'part_time', 'contract', 'intern', 'temporary'),
        defaultValue: 'full_time',
      },
      status: {
        type: Sequelize.ENUM('active', 'on_leave', 'exited', 'suspended'),
        defaultValue: 'active',
      },
      joined_at: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      exited_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      exit_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      emergency_contact_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      emergency_contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
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
    await queryInterface.addIndex('employees', ['employee_code'], {
      unique: true,
      name: 'idx_employees_code_unique',
    });
    await queryInterface.addIndex('employees', ['email'], {
      unique: true,
      name: 'idx_employees_email_unique',
    });
    await queryInterface.addIndex('employees', ['department_id'], {
      name: 'idx_employees_department',
    });
    await queryInterface.addIndex('employees', ['manager_id'], {
      name: 'idx_employees_manager',
    });
    await queryInterface.addIndex('employees', ['status'], {
      name: 'idx_employees_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('employees');
  },
};
