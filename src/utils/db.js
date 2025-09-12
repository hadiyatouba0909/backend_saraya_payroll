const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      console.log(`MySQL connected to ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      console.log(`Database: ${process.env.DB_NAME || 'payroll'}`);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('DB Config:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'payroll'
    });
    throw error;
  }
}

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query, testConnection };