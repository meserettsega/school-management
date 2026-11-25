const mysql = require('mysql2/promise');

let pool;

const getMysqlPool = () => {
  if (pool) return pool;

  const requiredVariables = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(`Missing MySQL environment variables: ${missingVariables.join(', ')}`);
  }

  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  return pool;
};

const checkMysqlConnection = async () => {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
};

const closeMysqlPool = async () => {
  if (!pool) return;
  await pool.end();
  pool = undefined;
};

module.exports = { checkMysqlConnection, closeMysqlPool, getMysqlPool };
