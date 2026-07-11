'use strict';

/**
 * Seeder: Default Users
 * 
 * Creates default admin and HR manager accounts for initial testing.
 * Passwords are pre-hashed using bcrypt with 12 salt rounds.
 * 
 * Default credentials:
 *   Admin:     admin@hrsystem.local / Admin@123456
 *   HR Manager: hr@hrsystem.local / HR@123456
 */

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const salt = await bcrypt.genSalt(12);
    const adminPassword = await bcrypt.hash('Admin@123456', salt);
    const hrPassword = await bcrypt.hash('HR@123456', salt);

    const users = [
      {
        id: 'c1d2e3f4-0001-4000-8000-000000000001',
        employee_id: null, // Admin is not linked to an employee
        email: 'admin@hrsystem.local',
        password_hash: adminPassword,
        role: 'admin',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c1d2e3f4-0001-4000-8000-000000000002',
        employee_id: 'b1c2d3e4-0001-4000-8000-000000000003', // Rahul Verma
        email: 'rahul.verma@hrsystem.local',
        password_hash: hrPassword,
        role: 'hr_manager',
        is_active: true,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c1d2e3f4-0001-4000-8000-000000000003',
        employee_id: 'b1c2d3e4-0001-4000-8000-000000000001', // Arjun Mehta
        email: 'arjun.mehta@hrsystem.local',
        password_hash: hrPassword,
        role: 'employee',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c1d2e3f4-0001-4000-8000-000000000004',
        employee_id: 'b1c2d3e4-0001-4000-8000-000000000002', // Priya Sharma
        email: 'priya.sharma@hrsystem.local',
        password_hash: await bcrypt.hash('Employee@123', salt),
        role: 'employee',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('users', users, {});
    console.log('✓ Seeded 4 users (1 admin, 1 HR manager, 2 employees)');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};
