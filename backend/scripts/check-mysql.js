require('dotenv').config();

const { checkMysqlConnection, closeMysqlPool } = require('../config/mysqlDatabase');

const main = async () => {
  try {
    await checkMysqlConnection();
    console.log('MySQL connection successful');
  } catch (error) {
    console.error(`MySQL connection failed${error.code ? ` (${error.code})` : ''}: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeMysqlPool();
  }
};

main();
