/**
 * Database Configuration
 * 
 * Provides Sequelize configuration for development, test, and production
 * environments. Settings are loaded from environment variables with
 * sensible defaults for local development.
 * Supports DATABASE_URL (e.g., from Railway) or individual connection params.
 * 
 * @module config/database
 */
require('dotenv').config();

// Parse DATABASE_URL if provided (e.g., Railway auto-injects this)
const parseDatabaseUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 5432,
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: parsed.searchParams.get('sslmode') === 'require',
    };
  } catch {
    return null;
  }
};

const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
const dbUrlParsed = parseDatabaseUrl(dbUrl);

const commonConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: dbUrlParsed?.host || process.env.DB_HOST || '127.0.0.1',
  port: dbUrlParsed?.port || parseInt(process.env.DB_PORT, 10) || 5432,
  logging: process.env.NODE_ENV === 'development' 
    ? (msg) => console.debug(`[SQL] ${msg}`) 
    : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft deletes enabled globally
    charset: 'utf8',
  },
  dialectOptions: {
    // Ensure proper date handling
    useUTC: true,
    ...(dbUrlParsed?.ssl || process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {}),
  },
};

module.exports = {
  development: {
    ...commonConfig,
    username: dbUrlParsed?.username || process.env.DB_USER || 'postgres',
    password: dbUrlParsed?.password || process.env.DB_PASSWORD || '',
    database: dbUrlParsed?.database || process.env.DB_NAME || 'hr_management',
  },
  test: {
    ...commonConfig,
    username: dbUrlParsed?.username || process.env.DB_USER || 'postgres',
    password: dbUrlParsed?.password || process.env.DB_PASSWORD || '',
    database: dbUrlParsed?.database || process.env.DB_NAME || 'hr_management_test',
    logging: false,
  },
  production: {
    ...commonConfig,
    username: dbUrlParsed?.username || process.env.DB_USER,
    password: dbUrlParsed?.password || process.env.DB_PASSWORD,
    database: dbUrlParsed?.database || process.env.DB_NAME,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      useUTC: true,
      ssl: dbUrlParsed?.ssl || process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  },
};
