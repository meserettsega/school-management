const mongoose = require('mongoose');
mongoose.set('strictPopulate', false);
const { checkMysqlConnection } = require('./mysqlDatabase');

const connectDB = async () => {
  if (process.env.DB_ENGINE === 'mysql') {
    try {
      await checkMysqlConnection();
      console.log('MySQL Connected');
    } catch (error) {
      console.error(`MySQL connection failed: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  if (process.env.DB_ENGINE && process.env.DB_ENGINE !== 'mongodb') {
    throw new Error('DB_ENGINE must be either "mysql" or "mongodb"');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
