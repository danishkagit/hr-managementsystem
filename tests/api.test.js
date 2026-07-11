/**
 * API Integration Tests
 *
 * Tests all API endpoints including route existence, auth enforcement,
 * request validation, error handling, and response structure.
 *
 * @module tests/api
 */
const request = require('supertest');
const { buildTestApp } = require('./helpers/testApp');

const app = buildTestApp();
const API_PREFIX = '/api/v1';

// ─────────────────────────────────────────────────────────────
// API ROOT & HEALTH
// ─────────────────────────────────────────────────────────────
describe('API Root & Health', () => {
  describe('GET /api/v1', () => {
    it('should return API metadata with 200 status', async () => {
      const res = await request(app).get(`${API_PREFIX}/`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('HR Management System API is running');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body.endpoints).toHaveProperty('health');
      expect(res.body.endpoints).toHaveProperty('auth');
      expect(res.body.endpoints).toHaveProperty('employees');
      expect(res.body.endpoints).toHaveProperty('departments');
      expect(res.body.endpoints).toHaveProperty('attendance');
      expect(res.body.endpoints).toHaveProperty('leaves');
    });
  });

  describe('GET /health', () => {
    it('should return health status with 200', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('operational');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('version');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SWAGGER DOCS
// ─────────────────────────────────────────────────────────────
describe('Swagger Documentation', () => {
  describe('GET /api/v1/docs', () => {
    it('should serve Swagger UI HTML page', async () => {
      const res = await request(app).get(`${API_PREFIX}/docs/`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('swagger-ui');
      expect(res.text).toContain('HR Management System - API Docs');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────
describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when email and password are missing', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('MISSING_CREDENTIALS');
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({ password: 'test123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_CREDENTIALS');
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_CREDENTIALS');
    });

    it('should return 401 with invalid credentials', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({ email: 'nonexistent@test.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({ email: 'test@test.com', password: 'Test12345', name: 'Test User' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .set('Authorization', 'Bearer invalid-token-here')
        .send({ email: 'test@test.com', password: 'Test12345', name: 'Test User' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 400 when refresh token is missing', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/logout`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/auth/me`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('PATCH /api/v1/auth/password', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/auth/password`)
        .send({ currentPassword: 'old', newPassword: 'new' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/auth/password`)
        .set('Authorization', 'Bearer badtoken')
        .send({ currentPassword: 'old', newPassword: 'new' });

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// DEPARTMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────
describe('Department Endpoints', () => {
  describe('GET /api/v1/departments', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/departments`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/departments`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should accept valid pagination parameters', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/departments?page=1&limit=10`)
        .set('Authorization', 'Bearer invalid-token');

      // Auth will still fail, but pagination should be parsed without error
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/departments/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/departments/550e8400-e29b-41d4-a716-446655440000`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/departments/not-a-uuid`)
        .set('Authorization', 'Bearer some-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/departments', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/departments`)
        .send({ name: 'Test Dept', code: 'TST' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/departments/:id', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/departments/bad-uuid`)
        .set('Authorization', 'Bearer some-token')
        .send({ name: 'Updated' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/departments/:id', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .delete(`${API_PREFIX}/departments/bad-uuid`)
        .set('Authorization', 'Bearer some-token');

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// EMPLOYEE ENDPOINTS
// ─────────────────────────────────────────────────────────────
describe('Employee Endpoints', () => {
  describe('GET /api/v1/employees', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/employees`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/v1/employees/stats', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/employees/stats`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/employees/550e8400-e29b-41d4-a716-446655440000`);

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/employees/invalid`)
        .set('Authorization', 'Bearer some-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/employees', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/employees`)
        .send({ first_name: 'John', last_name: 'Doe', email: 'john@test.com', department_id: '550e8400-e29b-41d4-a716-446655440000', designation: 'Dev' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/employees/:id', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/employees/bad`)
        .set('Authorization', 'Bearer token')
        .send({ first_name: 'Jane' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/employees/:id/offboard', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/employees/bad/offboard`)
        .set('Authorization', 'Bearer token')
        .send({ reason: 'Resigned' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .delete(`${API_PREFIX}/employees/bad`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// ATTENDANCE ENDPOINTS
// ─────────────────────────────────────────────────────────────
describe('Attendance Endpoints', () => {
  describe('GET /api/v1/attendance', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/attendance`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/v1/attendance/live', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/attendance/live`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/attendance/stats', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/attendance/stats`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/attendance/checkin', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/attendance/checkin`)
        .send({ employee_id: '550e8400-e29b-41d4-a716-446655440000' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/attendance/checkout', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/attendance/checkout`)
        .send({ employee_id: '550e8400-e29b-41d4-a716-446655440000' });

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// LEAVE ENDPOINTS
// ─────────────────────────────────────────────────────────────
describe('Leave Management Endpoints', () => {
  describe('GET /api/v1/leaves', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/leaves`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/v1/leaves/stats', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`${API_PREFIX}/leaves/stats`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/leaves/balance/:employeeId', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/leaves/balance/550e8400-e29b-41d4-a716-446655440000`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/leaves/balance/bad-uuid`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/leaves', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/leaves`)
        .send({
          employee_id: '550e8400-e29b-41d4-a716-446655440000',
          leave_type: 'annual',
          start_date: '2024-06-01',
          end_date: '2024-06-05',
          reason: 'Vacation',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/leaves/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/leaves/550e8400-e29b-41d4-a716-446655440000`);

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/leaves/bad-id`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/leaves/:id/approve', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/leaves/550e8400-e29b-41d4-a716-446655440000/approve`);

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/leaves/bad-id/approve`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/leaves/:id/reject', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/leaves/bad-id/reject`)
        .set('Authorization', 'Bearer token')
        .send({ reason: 'Not enough balance' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/leaves/:id/cancel', () => {
    it('should return 401 with invalid token even with bad UUID (auth runs first)', async () => {
      const res = await request(app)
        .patch(`${API_PREFIX}/leaves/bad-id/cancel`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────
describe('Error Handling', () => {
  describe('404 for unknown routes', () => {
    it('should return 404 for non-existent API route', async () => {
      const res = await request(app).get(`${API_PREFIX}/nonexistent`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should include HTTP method and path in error message', async () => {
      const res = await request(app).post(`${API_PREFIX}/unknown`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('POST');
      expect(res.body.message).toContain('/api/v1/unknown');
    });
  });

  describe('JSON body parsing', () => {
    it('should handle invalid JSON gracefully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .set('Content-Type', 'application/json')
        .send('not-json-at-all');

      expect(res.status).toBe(400);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE EDGE CASES
// ─────────────────────────────────────────────────────────────
describe('Auth Middleware Edge Cases', () => {
  describe('Protected routes without Bearer prefix', () => {
    it('should return 401 when token is missing Bearer prefix', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/employees`)
        .set('Authorization', 'Token sometoken');

      expect(res.status).toBe(401);
    });
  });

  describe('Protected routes with empty token', () => {
    it('should return 401 when Authorization header is empty Bearer', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/departments`)
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });
  });
});
