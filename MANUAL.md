# HR Management System — Manual

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Tech Stack:** Node.js, Express, PostgreSQL, Sequelize ORM, Socket.IO, JWT

---

## Table of Contents

1. [Tech Stack & Rationale](#1-tech-stack--rationale)
2. [Folder Structure](#2-folder-structure)
3. [Installation & Setup](#3-installation--setup)
4. [API Endpoints](#4-api-endpoints)
5. [Real-Time Events (Socket.IO)](#5-real-time-events-socketio)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Making Future Changes Safely](#7-making-future-changes-safely)
8. [Database Backup & Restore](#8-database-backup--restore)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Tech Stack & Rationale

| Technology | Version | Purpose | Why Chosen |
|---|---|---|---|
| **Node.js** | 26.x | Runtime | Async I/O, vast ecosystem, excellent for API servers |
| **Express** | 4.x | Web framework | Industry standard, stable, extensible middleware |
| **PostgreSQL** | 18 | Database | Mature ACID compliance, JSON support, full-text search later |
| **Sequelize** | 6.x | ORM | Mature ORM with migrations, model sync, association management |
| **Socket.IO** | 4.x | WebSockets | Auto-reconnect, fallback transports, room management |
| **JSON Web Token** | 9.x | Auth | Stateless authentication, role embedding |
| **bcryptjs** | 2.x | Password hashing | Constant-time comparison, 12-round salt |
| **Winston** | 3.x | Logging | Structured JSON logs, multiple transports |
| **Express Rate Limit** | 7.x | Rate limiting | In-memory rate limiting, standard headers |

**Architecture decisions:**

- **Sequelize over raw SQL:** Provides migration versioning, model validation hooks, eager/lazy loading, and a clean migration system. New tables/columns are always added via new migrations — never by editing old ones.
- **Socket.IO over raw WebSocket:** Automatic reconnection, fallback to long-polling, room-based broadcasting for targeted notifications.
- **JWT over sessions:** Stateless auth works well with WebSocket handshake authentication and allows future microservice separation.
- **Winston over console.log:** Structured logging with levels, file rotation, and JSON output for ELK/Grafana integration later.

---

## 2. Folder Structure

```
hr-management-backend/
├── .env                    # Environment variables (git-ignored)
├── .env.example            # Example environment config
├── .sequelizerc            # Sequelize CLI config
├── package.json
├── MANUAL.md              ← YOU ARE HERE
│
└── src/
    ├── server.js           # Entry point: Express + HTTP + Socket.IO init
    │
    ├── config/
    │   ├── database.js     # Sequelize connection settings (dev/test/prod)
    │   └── server.js       # App-level config (JWT, CORS, rate limit, etc.)
    │
    ├── models/
    │   ├── index.js        # Sequelize instance, all models + associations
    │   ├── Department.js   # Department entity
    │   ├── Employee.js     # Employee entity (onboarding/offboarding methods)
    │   ├── User.js         # Auth user entity (password hashing, JWT helpers)
    │   ├── Attendance.js   # Check-in/check-out with work hours calc
    │   └── LeaveRequest.js # Leave request with approval workflow
    │
    ├── controllers/
    │   ├── authController.js       # Login, register, refresh, logout
    │   ├── departmentController.js # CRUD for departments
    │   ├── employeeController.js   # CRUD + onboard/offboard + stats
    │   ├── attendanceController.js # Check-in/out, live status, reports
    │   └── leaveController.js      # Request, approve, reject, balances
    │
    ├── routes/
    │   ├── index.js         # Route aggregator (mounts all modules under /api/v1)
    │   ├── auth.js
    │   ├── department.js
    │   ├── employee.js
    │   ├── attendance.js
    │   └── leave.js
    │
    ├── middleware/
    │   ├── auth.js          # JWT verify + role-based guard
    │   ├── errorHandler.js  # AppError class + centralized error handling
    │   └── validate.js      # Field required, UUID, pagination validators
    │
    ├── sockets/
    │   └── index.js         # Socket.IO init, event handlers, broadcast helpers
    │
    ├── utils/
    │   └── logger.js        # Winston logger instance
    │
    ├── migrations/          # Sequelize migration files (never edit after creation!)
    │   ├── 20240101000001-create-departments.js
    │   ├── 20240101000002-create-employees.js
    │   ├── 20240101000003-create-users.js
    │   ├── 20240101000004-create-attendance.js
    │   └── 20240101000005-create-leave-requests.js
    │
    └── seeders/             # Sample/seed data
        ├── 20240101000001-departments.js
        ├── 20240101000002-employees.js
        └── 20240101000003-users.js
```

---

## 3. Installation & Setup

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)

### Step 1: Install PostgreSQL Locally

```bash
# Windows — download installer from postgresql.org and run it.
# Or via winget:
winget install PostgreSQL.PostgreSQL

# Start the PostgreSQL service
# Windows (if installed as a service):
net start postgresql-x64-18
```

### Step 2: Create the Database

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create the database
CREATE DATABASE hr_management;

# Verify
\c hr_management
\q
```

### Step 3: Configure Environment

```bash
cd hr-management-backend

# Copy the example env file
cp .env.example .env

# Edit .env with your database credentials
# Minimum required changes:
#   DB_PASSWORD=your_postgres_password
#   JWT_SECRET=your_random_secret_here
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Run Migrations & Seeders

```bash
# Run all migrations (creates tables)
npm run migrate

# Seed initial data (departments, employees, users)
npm run seed

# Or do both at once:
npm run db:setup
```

### Step 6: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Expected output:
```
[INFO] ✓ Database connection established successfully
[INFO] ═══════════════════════════════════════════════
[INFO]   HR Management System v1.0.0
[INFO]   Environment: DEVELOPMENT
[INFO]   Server:      http://0.0.0.0:4000
[INFO]   API:         http://0.0.0.0:4000/api/v1
[INFO]   WebSocket:   0.0.0.0:4000/socket.io
[INFO]   Database:    hr_management@127.0.0.1
[INFO] ═══════════════════════════════════════════════
```

### Step 7: Verify Everything Works

```bash
# Health check
curl http://localhost:4000/health

# Login as admin
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrsystem.local","password":"Admin@123456"}'
```

---

## 4. API Endpoints

### Authentication

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/v1/auth/login` | No | — | Login with email + password |
| `POST` | `/api/v1/auth/register` | Yes | Admin | Create new user account |
| `POST` | `/api/v1/auth/refresh` | No | — | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Yes | Any | Invalidate current session |
| `GET` | `/api/v1/auth/me` | Yes | Any | Get current user profile |
| `PATCH` | `/api/v1/auth/password` | Yes | Any | Change own password |

**Login — Request:**
```json
{
  "email": "admin@hrsystem.local",
  "password": "Admin@123456"
}
```

**Login — Response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": "...", "email": "admin@hrsystem.local", "role": "admin" },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "8h"
    }
  }
}
```

### Departments

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/v1/departments` | Yes | Any | List departments (paginated) |
| `GET` | `/api/v1/departments/:id` | Yes | Any | Get department details |
| `POST` | `/api/v1/departments` | Yes | Admin/HR | Create department |
| `PATCH` | `/api/v1/departments/:id` | Yes | Admin/HR | Update department |
| `DELETE` | `/api/v1/departments/:id` | Yes | Admin | Delete department |

**Create Department — Request:**
```json
{
  "name": "Design",
  "code": "DSG",
  "description": "Creative design team"
}
```

**Query Parameters (list):**
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `search` (string, searches name)
- `is_active` (boolean)

### Employees

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/v1/employees` | Yes | Any | List employees (paginated) |
| `GET` | `/api/v1/employees/stats` | Yes | Any | Employee statistics |
| `GET` | `/api/v1/employees/:id` | Yes | Any | Get employee details |
| `POST` | `/api/v1/employees` | Yes | Admin/HR | Onboard new employee |
| `PATCH` | `/api/v1/employees/:id` | Yes | Admin/HR | Update employee profile |
| `POST` | `/api/v1/employees/:id/offboard` | Yes | Admin/HR | Offboard (exit) employee |
| `DELETE` | `/api/v1/employees/:id` | Yes | Admin | Delete employee record |

**Onboard Employee — Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1-555-0100",
  "department_id": "a1b2c3d4-0001-4000-8000-000000000001",
  "designation": "Software Engineer",
  "employment_type": "full_time",
  "joined_at": "2024-01-15",
  "manager_id": "b1c2d3e4-0001-4000-8000-000000000001"
}
```

**Offboard Employee — Request:**
```json
{
  "reason": "Resigned for personal reasons",
  "exit_date": "2024-06-30"
}
```

**Query Parameters (list):**
- `page`, `limit`
- `search` (searches name, code, email)
- `status` (active, on_leave, exited, suspended)
- `department_id` (UUID)
- `employment_type` (full_time, part_time, contract, intern, temporary)

### Attendance

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/v1/attendance/checkin` | Yes | Admin/HR | Record check-in |
| `POST` | `/api/v1/attendance/checkout` | Yes | Admin/HR | Record check-out |
| `GET` | `/api/v1/attendance/live` | Yes | Any | Live who's in/out dashboard |
| `GET` | `/api/v1/attendance` | Yes | Any | List attendance records |
| `GET` | `/api/v1/attendance/stats` | Yes | Any | Attendance statistics |

**Check-In — Request:**
```json
{
  "employee_id": "b1c2d3e4-0001-4000-8000-000000000001",
  "notes": "On time today"
}
```

**Live Dashboard — Response:**
```json
{
  "success": true,
  "data": {
    "checkedIn": [
      {
        "id": "...",
        "employeeId": "...",
        "employeeName": "Arjun Mehta",
        "employeeCode": "EMP-0001",
        "department": "Engineering",
        "designation": "Engineering Manager",
        "checkInTime": "2024-07-11T09:05:00.000Z",
        "isLate": true,
        "lateMinutes": 5
      }
    ],
    "checkedInCount": 1,
    "availableEmployees": [...],
    "availableCount": 4,
    "totalActive": 5
  }
}
```

### Leaves

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/v1/leaves` | Yes | Any | Create leave request |
| `GET` | `/api/v1/leaves` | Yes | Any | List leave requests |
| `GET` | `/api/v1/leaves/stats` | Yes | Any | Leave statistics |
| `GET` | `/api/v1/leaves/:id` | Yes | Any | Get leave request details |
| `GET` | `/api/v1/leaves/balance/:employeeId` | Yes | Any | Get leave balances |
| `PATCH` | `/api/v1/leaves/:id/approve` | Yes | Admin/HR | Approve leave |
| `PATCH` | `/api/v1/leaves/:id/reject` | Yes | Admin/HR | Reject leave |
| `PATCH` | `/api/v1/leaves/:id/cancel` | Yes | Admin/HR | Cancel leave |

**Create Leave Request:**
```json
{
  "employee_id": "b1c2d3e4-0001-4000-8000-000000000001",
  "leave_type": "annual",
  "start_date": "2024-08-01",
  "end_date": "2024-08-05",
  "reason": "Family vacation",
  "contact_during_leave": "+1-555-0100"
}
```

**Leave Balance — Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "...",
    "employeeName": "Arjun Mehta",
    "year": "2024",
    "balances": {
      "annual": { "total": 20, "used": 5, "remaining": 15 },
      "sick": { "total": 12, "used": 2, "remaining": 10 },
      "personal": { "total": 5, "used": 0, "remaining": 5 },
      ...
    }
  }
}
```

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Server health check |
| `GET` | `/api/v1/health` | No | API health check |

---

## 5. Real-Time Events (Socket.IO)

The system uses Socket.IO for real-time event broadcasting. Connect to:

```
ws://localhost:4000/socket.io
```

### Connection

```javascript
// Client-side connection (browser or Node.js)
const socket = io('http://localhost:4000', {
  path: '/socket.io',
  auth: {
    token: 'your-jwt-token'  // Optional - needed for role-based rooms
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connected', (data) => {
  console.log('Server says:', data.message);
});
```

### Events List

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `employee:created` | `{ employee }` | New employee onboarded |
| `employee:updated` | `{ employee }` | Employee profile updated |
| `employee:deleted` | `{ employeeId }` | Employee record deleted |
| `employee:offboarded` | `{ employee }` | Employee offboarded |
| `attendance:checkin` | `{ attendance, employee, timestamp }` | Employee checks in |
| `attendance:checkout` | `{ attendance, employee, timestamp }` | Employee checks out |
| `department:created` | `{ department }` | New department created |
| `department:updated` | `{ department }` | Department updated |
| `department:deleted` | `{ departmentId }` | Department deleted |
| `leave:created` | `{ leaveRequest }` | Leave request submitted |
| `leave:approved` | `{ leaveRequest }` | Leave request approved |
| `leave:rejected` | `{ leaveRequest }` | Leave request rejected |
| `leave:cancelled` | `{ leaveRequest }` | Leave request cancelled |
| `notification` | `{ type, data, timestamp }` | General notification |

### Client-Side Events

The client can emit these events to the server:

| Event | Payload | Description |
|-------|---------|-------------|
| `join:department` | `departmentId` | Join a department-specific room |
| `leave:department` | `departmentId` | Leave a department room |
| `request:live-attendance` | — | Request current live attendance snapshot |
| `ping` | `callback` | Health check (server responds with `{ pong: true }`) |

---

## 6. Authentication & Authorization

### Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `admin` | 3 | Full access — all CRUD, user management, system config |
| `hr_manager` | 2 | Employee/attendance/leave management, no user creation |
| `employee` | 1 | View own data, create leave requests |

### How Auth Works

1. **Login** → Get `accessToken` (expires in 8h) + `refreshToken` (expires in 7d)
2. **API calls** → Include `Authorization: Bearer <accessToken>` header
3. **Token refresh** → `POST /api/v1/auth/refresh` with `{ refreshToken: "..." }`
4. **Logout** → `POST /api/v1/auth/logout` invalidates the refresh token

### Default Credentials (Dev Only — Change in Production!)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hrsystem.local` | `Admin@123456` |
| HR Manager | `rahul.verma@hrsystem.local` | `HR@123456` |
| Employee | `arjun.mehta@hrsystem.local` | `HR@123456` |
| Employee | `priya.sharma@hrsystem.local` | `Employee@123` |

---

## 7. Making Future Changes Safely

### 7.1 Add a New Database Table

1. Generate a new migration file:
   ```bash
   npx sequelize-cli migration:generate --name create-payrolls
   ```
2. Implement `up` and `down` in the generated file (add fields, indexes, FKs)
3. Create a corresponding model in `src/models/`
4. Add the model to `src/models/index.js` (import, init, associations)
5. Run migration:
   ```bash
   npm run migrate
   ```

**NEVER edit an existing migration file** that has already been run in any environment. Always create a new migration for schema changes.

### 7.2 Add a New Column to an Existing Table

Create a new migration (don't edit the old one):

```bash
npx sequelize-cli migration:generate --name add-budget-to-departments
```

```javascript
// In the generated migration file:
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('departments', 'budget', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('departments', 'budget');
  },
};
```

### 7.3 Roll Back a Migration

```bash
# Undo the most recent migration
npm run migrate:undo

# Undo all migrations
npm run migrate:undo:all

# Undo and redo everything (useful for development)
npm run db:reset
```

**Warning:** Rolling back in production will drop columns/tables. Use with extreme caution. Prefer creating "additive" migrations (adding columns) over destructive ones.

### 7.4 Add a New API Route

1. Create the controller in `src/controllers/yourEntityController.js`
2. Create the route file in `src/routes/yourEntity.js`
3. Add `router.use('/your-entity', require('./yourEntity'));` in `src/routes/index.js`
4. If authentication/roles are needed, add the middleware in the route file
5. Test with curl/Postman

### 7.5 Add a New Controller

Follow the existing pattern:

```javascript
const { YourModel } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');

const list = async (req, res, next) => {
  try {
    // ... handler logic
    res.json({ success: true, data: { ... } });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, remove };
```

### 7.6 Add a New Socket Event

1. Add the event name constant in `src/sockets/index.js`
2. Emit the event from the controller:
   ```javascript
   getIO().emit('your:event', { data: payload });
   ```
3. Document the event in this manual

### 7.7 Update Environment Variables Without Downtime

1. Edit the `.env` file
2. Restart the server:
   ```bash
   # If using PM2:
   pm2 restart hr-management-backend

   # If using nodemon (dev):
   # The file watcher will auto-restart

   # If using systemd:
   sudo systemctl restart hr-management
   ```

For zero-downtime changes, use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name hr-management-backend -i 2
pm2 reload hr-management-backend  # Zero-downtime reload
```

---

## 8. Database Backup & Restore

### Backup

```bash
# Full backup
pg_dump -U postgres -d hr_management -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Schema-only backup
pg_dump -U postgres -d hr_management -s -f schema_backup.sql

# Data-only backup
pg_dump -U postgres -d hr_management -a -f data_backup.sql
```

### Restore

```bash
# Full restore (creates tables and inserts data)
pg_restore -U postgres -d hr_management -c backup_file.dump

# From SQL file
psql -U postgres -d hr_management < backup.sql
```

### Automated Backup Script

Create a cron job (Linux/Mac) or scheduled task (Windows):

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DB_NAME="hr_management"
DB_USER="postgres"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER -d $DB_NAME -F c \
  -f "$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d).dump"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
```

---

## 9. Troubleshooting

### Common Errors

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `ECONNREFUSED :5432` | PostgreSQL not running | Start PostgreSQL service |
| `database "hr_management" does not exist` | Database not created | Run `createdb hr_management` |
| `relation "departments" does not exist` | Migrations not run | Run `npm run migrate` |
| `Invalid credentials` | Wrong email/password | Use default credentials or reset password |
| `Token expired` | JWT expired (>8h) | Call `/auth/refresh` endpoint |
| `No token provided` | Missing auth header | Add `Authorization: Bearer <token>` |
| `CORS error` | Origin not whitelisted | Add origin to `CORS_ORIGIN` in `.env` |
| `Port 4000 already in use` | Another process on port | Change `PORT` in `.env` or kill the process |
| `Migration 202401... has already been applied` | Migration conflict | Check `SequelizeMeta` table, use `migrate:undo` |

### Port Conflicts

```bash
# Find what's using port 4000
# Windows:
netstat -ano | findstr :4000
# Kill the process:
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :4000
kill -9 <PID>
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Test connection:
   ```bash
   psql -U postgres -d hr_management -c "SELECT 1;"
   ```

3. Check `pg_hba.conf` allows local connections (look for `local all all trust` or `md5`)

4. Verify `.env` has the correct `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`

### Migration Failures

If a migration fails:

1. Check the error message — it usually indicates the exact problem
2. Fix the issue (e.g., missing column, constraint violation)
3. Manually remove the failed migration entry from `SequelizeMeta` table if it was partially applied:
   ```sql
   DELETE FROM "SequelizeMeta" WHERE name = '20240101000006-bad-migration.js';
   ```
4. Run the migration again

---

## Quick Reference Card

```bash
# Setup from scratch
npm install
npm run db:setup    # migrate + seed
npm run dev         # start development server

# Database operations
npm run migrate        # apply pending migrations
npm run migrate:undo   # rollback last migration
npm run seed           # insert seed data
npm run db:reset       # undo all + migrate + seed

# Server
npm start     # production mode
npm run dev   # development mode (nodemon)
```

---

> **Need to add a new feature?** Start by creating a migration, then a model, then a controller, then routes. Follow the existing patterns — they're designed for easy extension.
>
> **Questions?** Check the codebase — each file has JSDoc comments explaining its purpose and usage.
