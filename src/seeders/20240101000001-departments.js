'use strict';

/**
 * Seeder: Default Departments
 * 
 * Creates sample departments for initial testing.
 * All departments use fixed UUIDs for consistency.
 * 
 * To add MORE seed data:
 *   Create a new seeder file with a later timestamp.
 *   Never edit this file after it's been run in production.
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const departments = [
      {
        id: 'a1b2c3d4-0001-4000-8000-000000000001',
        name: 'Engineering',
        code: 'ENG',
        description: 'Software engineering and product development',
        head_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1b2c3d4-0001-4000-8000-000000000002',
        name: 'Human Resources',
        code: 'HR',
        description: 'People operations and talent management',
        head_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1b2c3d4-0001-4000-8000-000000000003',
        name: 'Marketing',
        code: 'MKT',
        description: 'Brand marketing and growth',
        head_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1b2c3d4-0001-4000-8000-000000000004',
        name: 'Finance & Accounting',
        code: 'FIN',
        description: 'Financial planning and accounting',
        head_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1b2c3d4-0001-4000-8000-000000000005',
        name: 'Operations',
        code: 'OPS',
        description: 'Business operations and logistics',
        head_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('departments', departments, {});
    console.log(`✓ Seeded ${departments.length} departments`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('departments', null, {});
  },
};
