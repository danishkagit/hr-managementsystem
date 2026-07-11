/**
 * Server Configuration
 * 
 * Centralized server settings loaded from environment variables.
 * 
 * @module config/server
 */
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  host: process.env.HOST || '0.0.0.0',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  ws: {
    path: process.env.WS_PATH || '/socket.io',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  // Default admin credentials (used in seeders - change in production!)
  defaultAdmin: {
    email: 'admin@hrsystem.local',
    password: 'Admin@123456',
    name: 'System Admin',
  },
};

module.exports = config;
