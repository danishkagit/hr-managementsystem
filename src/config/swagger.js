/**
 * Swagger/OpenAPI Configuration
 *
 * Comprehensive API documentation for the HR Management System.
 * Served at /api/v1/docs via swagger-ui-express.
 *
 * @module config/swagger
 */
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'HR Management System API',
    version: '1.0.0',
    description: `Production-grade HR management backend with PostgreSQL, real-time WebSockets, and JWT authentication.

## Features
- **Employee Management** - Onboarding, offboarding, profile management
- **Department Management** - CRUD operations with employee counts
- **Attendance Tracking** - Check-in/Check-out with live dashboard
- **Leave Management** - Full workflow: request, approve, reject, cancel
- **Real-time Updates** - WebSocket events for all operations
- **Role-based Access** - Admin, HR Manager, Employee roles
- **JWT Authentication** - Access & refresh tokens`,
    contact: {
      name: 'HR Management System',
      email: 'admin@hrsystem.local',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token obtained from /api/v1/auth/login',
      },
    },
    schemas: {
      // ───────────────────────────────────────────
      // COMMON SCHEMAS
      // ───────────────────────────────────────────
      Error: {
        type: 'object',
        required: ['success', 'message', 'code'],
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred' },
          code: { type: 'string', example: 'INTERNAL_ERROR' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                value: { type: 'string' },
              },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      UUID: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },

      // ───────────────────────────────────────────
      // AUTH SCHEMAS
      // ───────────────────────────────────────────
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@hrsystem.local' },
          password: { type: 'string', format: 'password', example: 'Admin@123456' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful.' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'string', example: '8h' },
                },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@company.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass123' },
          name: { type: 'string', example: 'John Doe' },
          role: { type: 'string', enum: ['employee', 'hr_manager', 'admin'], example: 'employee' },
          employee_id: { $ref: '#/components/schemas/UUID' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', description: 'Refresh token from login response' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'OldPass123' },
          newPassword: { type: 'string', format: 'password', example: 'NewPass456' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          email: { type: 'string', format: 'email', example: 'admin@hrsystem.local' },
          role: { type: 'string', enum: ['admin', 'hr_manager', 'employee'], example: 'admin' },
          is_active: { type: 'boolean', example: true },
          employee_id: { $ref: '#/components/schemas/UUID' },
          last_login_at: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // ───────────────────────────────────────────
      // DEPARTMENT SCHEMAS
      // ───────────────────────────────────────────
      Department: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          name: { type: 'string', example: 'Engineering' },
          code: { type: 'string', example: 'ENG' },
          description: { type: 'string', example: 'Software engineering department' },
          head_count: { type: 'integer', example: 15 },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          employees: {
            type: 'array',
            items: { $ref: '#/components/schemas/EmployeeSummary' },
          },
        },
      },
      DepartmentSummary: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          name: { type: 'string', example: 'Engineering' },
          code: { type: 'string', example: 'ENG' },
        },
      },
      CreateDepartmentRequest: {
        type: 'object',
        required: ['name', 'code'],
        properties: {
          name: { type: 'string', example: 'Engineering' },
          code: { type: 'string', example: 'ENG' },
          description: { type: 'string', example: 'Software engineering department' },
        },
      },
      UpdateDepartmentRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Engineering' },
          code: { type: 'string', example: 'ENG' },
          description: { type: 'string', example: 'Updated description' },
          is_active: { type: 'boolean', example: true },
        },
      },

      // ───────────────────────────────────────────
      // EMPLOYEE SCHEMAS
      // ───────────────────────────────────────────
      Employee: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@company.com' },
          phone: { type: 'string', example: '+1-555-0123' },
          employee_code: { type: 'string', example: 'EMP001' },
          designation: { type: 'string', example: 'Senior Developer' },
          employment_type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'], example: 'full_time' },
          status: { type: 'string', enum: ['active', 'on_leave', 'exited', 'suspended'], example: 'active' },
          department_id: { $ref: '#/components/schemas/UUID' },
          manager_id: { $ref: '#/components/schemas/UUID' },
          joined_at: { type: 'string', format: 'date', example: '2024-01-15' },
          date_of_birth: { type: 'string', format: 'date', example: '1990-05-20' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
          address: { type: 'string', example: '123 Main St, City' },
          emergency_contact_name: { type: 'string', example: 'Jane Doe' },
          emergency_contact_phone: { type: 'string', example: '+1-555-9999' },
          exit_reason: { type: 'string', nullable: true },
          exit_date: { type: 'string', format: 'date', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          department: { $ref: '#/components/schemas/DepartmentSummary' },
          manager: { $ref: '#/components/schemas/EmployeeSummary' },
          directReports: {
            type: 'array',
            items: { $ref: '#/components/schemas/EmployeeSummary' },
          },
          user: {
            type: 'object',
            properties: {
              id: { $ref: '#/components/schemas/UUID' },
              email: { type: 'string' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
            },
          },
        },
      },
      EmployeeSummary: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          employee_code: { type: 'string', example: 'EMP001' },
          designation: { type: 'string', example: 'Senior Developer' },
          status: { type: 'string', example: 'active' },
        },
      },
      CreateEmployeeRequest: {
        type: 'object',
        required: ['first_name', 'last_name', 'email', 'department_id', 'designation'],
        properties: {
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@company.com' },
          phone: { type: 'string', example: '+1-555-0123' },
          department_id: { $ref: '#/components/schemas/UUID' },
          designation: { type: 'string', example: 'Senior Developer' },
          employment_type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'], example: 'full_time' },
          joined_at: { type: 'string', format: 'date', example: '2024-01-15' },
          manager_id: { $ref: '#/components/schemas/UUID' },
          date_of_birth: { type: 'string', format: 'date', example: '1990-05-20' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          address: { type: 'string', example: '123 Main St, City' },
          emergency_contact_name: { type: 'string', example: 'Jane Doe' },
          emergency_contact_phone: { type: 'string', example: '+1-555-9999' },
        },
      },
      UpdateEmployeeRequest: {
        type: 'object',
        properties: {
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'john@company.com' },
          phone: { type: 'string', example: '+1-555-0123' },
          designation: { type: 'string', example: 'Lead Developer' },
          employment_type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'] },
          manager_id: { $ref: '#/components/schemas/UUID' },
          date_of_birth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          address: { type: 'string' },
          emergency_contact_name: { type: 'string' },
          emergency_contact_phone: { type: 'string' },
        },
      },
      OffboardRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', example: 'Resigned for personal reasons' },
          exit_date: { type: 'string', format: 'date', example: '2024-06-30' },
        },
      },
      EmployeeStats: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 50 },
              active: { type: 'integer', example: 45 },
              onLeave: { type: 'integer', example: 3 },
              exited: { type: 'integer', example: 2 },
              suspended: { type: 'integer', example: 0 },
            },
          },
          byDepartment: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { $ref: '#/components/schemas/UUID' },
                name: { type: 'string' },
                code: { type: 'string' },
                count: { type: 'integer' },
              },
            },
          },
        },
      },

      // ───────────────────────────────────────────
      // ATTENDANCE SCHEMAS
      // ───────────────────────────────────────────
      Attendance: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          employee_id: { $ref: '#/components/schemas/UUID' },
          date: { type: 'string', format: 'date', example: '2024-03-15' },
          check_in_time: { type: 'string', format: 'date-time' },
          check_out_time: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['present', 'late', 'absent', 'half_day'], example: 'present' },
          is_late: { type: 'boolean', example: false },
          late_minutes: { type: 'integer', example: 15 },
          work_hours: { type: 'number', format: 'float', example: 8.5 },
          notes: { type: 'string', example: 'Working from home' },
          employee: { $ref: '#/components/schemas/EmployeeSummary' },
        },
      },
      CheckInRequest: {
        type: 'object',
        required: ['employee_id'],
        properties: {
          employee_id: { $ref: '#/components/schemas/UUID' },
          notes: { type: 'string', example: 'On-site' },
        },
      },
      CheckOutRequest: {
        type: 'object',
        required: ['employee_id'],
        properties: {
          employee_id: { $ref: '#/components/schemas/UUID' },
        },
      },
      LiveStatusResponse: {
        type: 'object',
        properties: {
          checkedIn: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                employeeId: { $ref: '#/components/schemas/UUID' },
                employeeName: { type: 'string' },
                employeeCode: { type: 'string' },
                designation: { type: 'string' },
                department: { type: 'string' },
                checkInTime: { type: 'string', format: 'date-time' },
                status: { type: 'string' },
              },
            },
          },
          checkedInCount: { type: 'integer', example: 12 },
          availableEmployees: { type: 'array', items: { $ref: '#/components/schemas/EmployeeSummary' } },
          availableCount: { type: 'integer', example: 33 },
          totalActive: { type: 'integer', example: 45 },
        },
      },
      AttendanceStats: {
        type: 'object',
        properties: {
          daily: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                total: { type: 'string', example: '30' },
                present: { type: 'string', example: '25' },
                late: { type: 'string', example: '3' },
                absent: { type: 'string', example: '2' },
                half_day: { type: 'string', example: '1' },
                avg_work_hours: { type: 'string', example: '7.5' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              totalRecords: { type: 'integer', example: 150 },
              present: { type: 'integer', example: 120 },
              late: { type: 'integer', example: 15 },
              absent: { type: 'integer', example: 10 },
              halfDay: { type: 'integer', example: 5 },
              avgWorkHours: { type: 'string', example: '7.25' },
            },
          },
        },
      },

      // ───────────────────────────────────────────
      // LEAVE SCHEMAS
      // ───────────────────────────────────────────
      LeaveRequest: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          employee_id: { $ref: '#/components/schemas/UUID' },
          leave_type: { type: 'string', enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'other'], example: 'annual' },
          start_date: { type: 'string', format: 'date', example: '2024-04-01' },
          end_date: { type: 'string', format: 'date', example: '2024-04-05' },
          total_days: { type: 'integer', example: 5 },
          reason: { type: 'string', example: 'Family vacation' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'], example: 'pending' },
          is_half_day: { type: 'boolean', example: false },
          contact_during_leave: { type: 'string', example: '+1-555-0123' },
          rejection_reason: { type: 'string', nullable: true },
          approved_at: { type: 'string', format: 'date-time', nullable: true },
          approved_by: { $ref: '#/components/schemas/UUID' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          employee: { $ref: '#/components/schemas/EmployeeSummary' },
          approver: {
            type: 'object',
            properties: {
              id: { $ref: '#/components/schemas/UUID' },
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
      CreateLeaveRequest: {
        type: 'object',
        required: ['employee_id', 'leave_type', 'start_date', 'end_date', 'reason'],
        properties: {
          employee_id: { $ref: '#/components/schemas/UUID' },
          leave_type: { type: 'string', enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'other'], example: 'annual' },
          start_date: { type: 'string', format: 'date', example: '2024-04-01' },
          end_date: { type: 'string', format: 'date', example: '2024-04-05' },
          reason: { type: 'string', example: 'Family vacation' },
          is_half_day: { type: 'boolean', example: false },
          contact_during_leave: { type: 'string', example: '+1-555-0123' },
        },
      },
      RejectLeaveRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', example: 'Insufficient leave balance' },
        },
      },
      LeaveBalance: {
        type: 'object',
        properties: {
          employeeId: { $ref: '#/components/schemas/UUID' },
          employeeName: { type: 'string', example: 'John Doe' },
          year: { type: 'string', example: '2024' },
          balances: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                leave_type: { type: 'string', example: 'annual' },
                entitled: { type: 'integer', example: 20 },
                used: { type: 'number', example: 5 },
                remaining: { type: 'number', example: 15 },
                pending: { type: 'number', example: 3 },
              },
            },
          },
        },
      },
      LeaveStats: {
        type: 'object',
        properties: {
          stats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                leave_type: { type: 'string', example: 'annual' },
                status: { type: 'string', example: 'approved' },
                count: { type: 'string', example: '15' },
                total_days: { type: 'string', example: '45' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ───────────────────────────────────────────────
    // AUTH PATHS
    // ───────────────────────────────────────────────
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login',
        description: 'Authenticate user with email and password. Returns JWT access and refresh tokens.',
        operationId: 'authLogin',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          400: { description: 'Missing credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Account deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register user',
        description: 'Register a new user account. Admin access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'authRegister',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh token',
        description: 'Get a new access token using a valid refresh token.',
        operationId: 'authRefresh',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Token refreshed successfully' },
          400: { description: 'Missing refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout',
        description: 'Invalidate the current refresh token.',
        security: [{ bearerAuth: [] }],
        operationId: 'authLogout',
        responses: {
          200: { description: 'Logged out successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get profile',
        description: 'Get the current authenticated user\'s profile with employee details.',
        security: [{ bearerAuth: [] }],
        operationId: 'authGetProfile',
        responses: {
          200: { description: 'User profile retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/auth/password': {
      patch: {
        tags: ['Authentication'],
        summary: 'Change password',
        description: 'Change the current user\'s password.',
        security: [{ bearerAuth: [] }],
        operationId: 'authChangePassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          400: { description: 'Missing fields or weak password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Incorrect password or auth required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ───────────────────────────────────────────────
    // DEPARTMENT PATHS
    // ───────────────────────────────────────────────
    '/api/v1/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments',
        description: 'List all departments with pagination and optional search.',
        security: [{ bearerAuth: [] }],
        operationId: 'departmentsList',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name (case-insensitive)' },
          { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: {
            description: 'Departments retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        departments: { type: 'array', items: { $ref: '#/components/schemas/Department' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Departments'],
        summary: 'Create department',
        description: 'Create a new department. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'departmentsCreate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDepartmentRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Department created successfully' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/departments/{id}': {
      get: {
        tags: ['Departments'],
        summary: 'Get department',
        description: 'Get a single department by ID with its employees.',
        security: [{ bearerAuth: [] }],
        operationId: 'departmentsGetById',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Department retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Department not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      patch: {
        tags: ['Departments'],
        summary: 'Update department',
        description: 'Update an existing department. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'departmentsUpdate',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDepartmentRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Department updated successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Department not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Departments'],
        summary: 'Delete department',
        description: 'Soft-delete a department. Admin access only. Department must have no active employees.',
        security: [{ bearerAuth: [] }],
        operationId: 'departmentsDelete',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Department deleted successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Department not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Department has active employees', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ───────────────────────────────────────────────
    // EMPLOYEE PATHS
    // ───────────────────────────────────────────────
    '/api/v1/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        description: 'List employees with pagination, search, and filtering.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesList',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, code, or email' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'on_leave', 'exited', 'suspended'] } },
          { name: 'department_id', in: 'query', schema: { $ref: '#/components/schemas/UUID' } },
          { name: 'employment_type', in: 'query', schema: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'] } },
        ],
        responses: {
          200: {
            description: 'Employees retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        employees: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Onboard employee',
        description: 'Onboard a new employee. Creates employee profile and auto-generates a user account. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesCreate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEmployeeRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Employee onboarded successfully' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Department or manager not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/employees/stats': {
      get: {
        tags: ['Employees'],
        summary: 'Employee statistics',
        description: 'Get employee statistics including counts by status and department.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesStats',
        responses: {
          200: {
            description: 'Statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/EmployeeStats' },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get employee',
        description: 'Get a single employee with full details including department, manager, direct reports, and user account.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesGetById',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Employee retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update employee',
        description: 'Update employee profile. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesUpdate',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Employee updated successfully' },
          400: { description: 'No valid fields provided', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Employees'],
        summary: 'Delete employee',
        description: 'Soft-delete an employee record. Admin access only.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesDelete',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Employee deleted successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Employee has active session', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/employees/{id}/offboard': {
      post: {
        tags: ['Employees'],
        summary: 'Offboard employee',
        description: 'Offboard (exit) an employee. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'employeesOffboard',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OffboardRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Employee offboarded successfully' },
          400: { description: 'Employee already offboarded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ───────────────────────────────────────────────
    // ATTENDANCE PATHS
    // ───────────────────────────────────────────────
    '/api/v1/attendance/checkin': {
      post: {
        tags: ['Attendance'],
        summary: 'Check in',
        description: 'Record employee check-in (entry). Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'attendanceCheckIn',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckInRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Check-in recorded successfully' },
          400: { description: 'Missing employee ID or invalid status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Already checked in today', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/attendance/checkout': {
      post: {
        tags: ['Attendance'],
        summary: 'Check out',
        description: 'Record employee check-out (exit). Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'attendanceCheckOut',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckOutRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Check-out recorded successfully' },
          400: { description: 'Missing employee ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/attendance/live': {
      get: {
        tags: ['Attendance'],
        summary: 'Live dashboard',
        description: 'Get currently checked-in employees vs available employees for the live attendance dashboard.',
        security: [{ bearerAuth: [] }],
        operationId: 'attendanceLive',
        responses: {
          200: {
            description: 'Live status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/LiveStatusResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List attendance records',
        description: 'Get attendance records with optional date range and employee filters.',
        security: [{ bearerAuth: [] }],
        operationId: 'attendanceList',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'employee_id', in: 'query', schema: { $ref: '#/components/schemas/UUID' } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['present', 'late', 'absent', 'half_day'] } },
        ],
        responses: {
          200: { description: 'Records retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/attendance/stats': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance statistics',
        description: 'Get attendance statistics for a date range.',
        security: [{ bearerAuth: [] }],
        operationId: 'attendanceStats',
        parameters: [
          { name: 'start_date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AttendanceStats' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing date range', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ───────────────────────────────────────────────
    // LEAVE PATHS
    // ───────────────────────────────────────────────
    '/api/v1/leaves': {
      get: {
        tags: ['Leave Management'],
        summary: 'List leave requests',
        description: 'List leave requests with filtering by employee, status, type, and date range.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesList',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'employee_id', in: 'query', schema: { $ref: '#/components/schemas/UUID' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] } },
          { name: 'leave_type', in: 'query', schema: { type: 'string', enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'other'] } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Leave requests retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Leave Management'],
        summary: 'Create leave request',
        description: 'Create a new leave request. All authenticated users can create their own leave requests.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesCreate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLeaveRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Leave request submitted successfully' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Overlapping leave request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/stats': {
      get: {
        tags: ['Leave Management'],
        summary: 'Leave statistics',
        description: 'Get leave statistics grouped by type and status.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesStats',
        parameters: [
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'department_id', in: 'query', schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: {
            description: 'Statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/LeaveStats' },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/balance/{employeeId}': {
      get: {
        tags: ['Leave Management'],
        summary: 'Leave balance',
        description: 'Get leave balance for a specific employee by year.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesBalance',
        parameters: [
          { name: 'employeeId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
          { name: 'year', in: 'query', schema: { type: 'string', example: '2024' } },
        ],
        responses: {
          200: {
            description: 'Leave balance retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/LeaveBalance' },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Employee not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/{id}': {
      get: {
        tags: ['Leave Management'],
        summary: 'Get leave request',
        description: 'Get a single leave request by ID.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesGetById',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Leave request retrieved successfully' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Leave request not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/{id}/approve': {
      patch: {
        tags: ['Leave Management'],
        summary: 'Approve leave',
        description: 'Approve a pending leave request. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesApprove',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Leave request approved successfully' },
          400: { description: 'Invalid leave status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Leave request not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/{id}/reject': {
      patch: {
        tags: ['Leave Management'],
        summary: 'Reject leave',
        description: 'Reject a pending leave request with a reason. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesReject',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RejectLeaveRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Leave request rejected' },
          400: { description: 'Invalid leave status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Leave request not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/leaves/{id}/cancel': {
      patch: {
        tags: ['Leave Management'],
        summary: 'Cancel leave',
        description: 'Cancel a leave request. Admin or HR Manager access required.',
        security: [{ bearerAuth: [] }],
        operationId: 'leavesCancel',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } },
        ],
        responses: {
          200: { description: 'Leave request cancelled' },
          401: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Leave request not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'User authentication and account management' },
    { name: 'Departments', description: 'Department CRUD operations' },
    { name: 'Employees', description: 'Employee management and onboarding' },
    { name: 'Attendance', description: 'Attendance tracking and live dashboard' },
    { name: 'Leave Management', description: 'Leave request workflow and balances' },
  ],
};

module.exports = swaggerSpec;
