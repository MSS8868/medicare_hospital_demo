const { Sequelize } = require('sequelize');
const path = require('path');

// Support both SQLite (development) and PostgreSQL (production)
const isProduction = process.env.NODE_ENV === 'production';

let sequelize;

if (isProduction && process.env.PGHOST) {
  // PostgreSQL for production (Railway) - use Railway's PG* variables
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'railway',
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
    dialectOptions: {
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    },
  });
} else {
  // SQLite for development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, '../../hospital.db'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
    },
  });
}

module.exports = sequelize;
