'use strict';

/**
 * Seeder: Sample Employees
 * 
 * Creates sample employees across different departments
 * for initial testing of the HR system.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const employees = [
      {
        id: 'b1c2d3e4-0001-4000-8000-000000000001',
        employee_code: 'EMP-0001',
        department_id: 'a1b2c3d4-0001-4000-8000-000000000001', // Engineering
        manager_id: null,
        first_name: 'Arjun',
        last_name: 'Mehta',
        email: 'arjun.mehta@hrsystem.local',
        phone: '+91-9876543210',
        designation: 'Engineering Manager',
        employment_type: 'full_time',
        status: 'active',
        joined_at: '2023-01-15',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b1c2d3e4-0001-4000-8000-000000000002',
        employee_code: 'EMP-0002',
        department_id: 'a1b2c3d4-0001-4000-8000-000000000001', // Engineering
        manager_id: 'b1c2d3e4-0001-4000-8000-000000000001',
        first_name: 'Priya',
        last_name: 'Sharma',
        email: 'priya.sharma@hrsystem.local',
        phone: '+91-9876543211',
        designation: 'Senior Software Engineer',
        employment_type: 'full_time',
        status: 'active',
        joined_at: '2023-03-01',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b1c2d3e4-0001-4000-8000-000000000003',
        employee_code: 'EMP-0003',
        department_id: 'a1b2c3d4-0001-4000-8000-000000000002', // HR
        manager_id: null,
        first_name: 'Rahul',
        last_name: 'Verma',
        email: 'rahul.verma@hrsystem.local',
        phone: '+91-9876543212',
        designation: 'HR Manager',
        employment_type: 'full_time',
        status: 'active',
        joined_at: '2022-11-01',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b1c2d3e4-0001-4000-8000-000000000004',
        employee_code: 'EMP-0004',
        department_id: 'a1b2c3d4-0001-4000-8000-000000000003', // Marketing
        manager_id: null,
        first_name: 'Ananya',
        last_name: 'Gupta',
        email: 'ananya.gupta@hrsystem.local',
        phone: '+91-9876543213',
        designation: 'Marketing Lead',
        employment_type: 'full_time',
        status: 'active',
        joined_at: '2023-06-01',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b1c2d3e4-0001-4000-8000-000000000005',
        employee_code: 'EMP-0005',
        department_id: 'a1b2c3d4-0001-4000-8000-000000000004', // Finance
        manager_id: null,
        first_name: 'Vikram',
        last_name: 'Singh',
        email: 'vikram.singh@hrsystem.local',
        phone: '+91-9876543214',
        designation: 'Finance Controller',
        employment_type: 'full_time',
        status: 'active',
        joined_at: '2022-08-15',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('employees', employees, {});
    console.log(`✓ Seeded ${employees.length} employees`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('employees', null, {});
  },
};
