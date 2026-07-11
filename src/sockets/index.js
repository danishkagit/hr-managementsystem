/**
 * Socket.IO Real-Time Layer
 * 
 * WebSocket server for real-time event broadcasting.
 * Connects to the HTTP server and provides bi-directional communication
 * for live dashboards, notifications, and status updates.
 * 
 * Events emitted:
 * - employee:created    - When a new employee is onboarded
 * - employee:updated    - When an employee record is updated
 * - employee:deleted    - When an employee is deleted
 * - employee:offboarded - When an employee is offboarded
 * - attendance:checkin  - When an employee checks in
 * - attendance:checkout - When an employee checks out
 * - department:created  - When a new department is created
 * - department:updated  - When a department is updated
 * - department:deleted  - When a department is deleted
 * - leave:created       - When a leave request is submitted
 * - leave:approved      - When a leave request is approved
 * - leave:rejected      - When a leave request is rejected
 * - leave:cancelled     - When a leave request is cancelled
 * - notification        - General notification events
 * 
 * When adding a NEW socket event:
 *   1. Define the event name as a constant below
 *   2. Emit it from the appropriate controller using getIO().emit()
 *   3. Document the event in MANUAL.md
 * 
 * @module sockets/index
 */
const { Server } = require('socket.io');
const config = require('../config/server');
const logger = require('../utils/logger');

let io = null;

/**
 * Socket event name constants
 */
const EVENTS = {
  EMPLOYEE_CREATED: 'employee:created',
  EMPLOYEE_UPDATED: 'employee:updated',
  EMPLOYEE_DELETED: 'employee:deleted',
  EMPLOYEE_OFFBOARDED: 'employee:offboarded',
  ATTENDANCE_CHECKIN: 'attendance:checkin',
  ATTENDANCE_CHECKOUT: 'attendance:checkout',
  DEPARTMENT_CREATED: 'department:created',
  DEPARTMENT_UPDATED: 'department:updated',
  DEPARTMENT_DELETED: 'department:deleted',
  LEAVE_CREATED: 'leave:created',
  LEAVE_APPROVED: 'leave:approved',
  LEAVE_REJECTED: 'leave:rejected',
  LEAVE_CANCELLED: 'leave:cancelled',
  NOTIFICATION: 'notification',
};

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: config.ws.path,
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,  // How often to ping clients (ms)
    pingTimeout: 20000,   // Time to wait for pong before disconnecting (ms)
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  // Authentication middleware for WebSocket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.user = decoded;
        socket.join(`user:${decoded.id}`);
        
        // Join role-based rooms for targeted broadcasting
        if (decoded.role) {
          socket.join(`role:${decoded.role}`);
        }
      } else {
        // Allow anonymous connections but with limited permissions
        socket.user = null;
        socket.join('public');
      }
      
      next();
    } catch (error) {
      logger.warn(`WebSocket auth failed: ${error.message}`);
      // Still allow connection but as anonymous
      socket.user = null;
      socket.join('public');
      next();
    }
  });

  // Handle new connections
  io.on('connection', (socket) => {
    const userInfo = socket.user
      ? `${socket.user.email} (${socket.user.role})`
      : 'anonymous';
    
    logger.info(`[WS] Client connected: ${socket.id} - ${userInfo}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to HR Management System',
      timestamp: new Date().toISOString(),
      socketId: socket.id,
    });

    // Handle client joining specific rooms
    socket.on('join:department', (departmentId) => {
      if (departmentId) {
        socket.join(`department:${departmentId}`);
        logger.debug(`[WS] ${socket.id} joined department:${departmentId}`);
      }
    });

    socket.on('leave:department', (departmentId) => {
      if (departmentId) {
        socket.leave(`department:${departmentId}`);
      }
    });

    // Handle client requesting current state
    socket.on('request:live-attendance', async () => {
      // Trigger a broadcast to this specific client
      const { Attendance } = require('../models');
      try {
        const activeSessions = await Attendance.getActiveSessions();
        socket.emit('attendance:live-update', {
          checkedIn: activeSessions,
          count: activeSessions.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('[WS] Error fetching live attendance:', error);
      }
    });

    // Generic ping-pong for health checks
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ pong: true, timestamp: new Date().toISOString() });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`[WS] Client disconnected: ${socket.id} - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`[WS] Socket error (${socket.id}):`, error.message);
    });
  });

  logger.info(`✓ WebSocket server initialized (path: ${config.ws.path})`);
  
  return io;
};

/**
 * Get the Socket.IO server instance
 * @returns {Object} Socket.IO server
 * @throws {Error} If socket not initialized
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized! Call initSocket() first with the HTTP server.');
  }
  return io;
};

/**
 * Broadcast a notification to relevant users
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @param {Array} [userIds] - Specific user IDs to notify (optional)
 */
const notify = (type, data, userIds) => {
  if (!io) return;
  
  const payload = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  if (userIds && userIds.length > 0) {
    // Send to specific users
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION, payload);
    });
  } else {
    // Broadcast to all connected clients
    io.emit(EVENTS.NOTIFICATION, payload);
  }
};

module.exports = {
  initSocket,
  getIO,
  notify,
  EVENTS,
};
