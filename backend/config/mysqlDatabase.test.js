const { getMysqlPool } = require('./mysqlDatabase');

const mysqlVariables = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PORT'];
let originalValues;

beforeEach(() => {
  originalValues = Object.fromEntries(
    mysqlVariables.map((name) => [name, process.env[name]])
  );
  mysqlVariables.forEach((name) => delete process.env[name]);
});

afterEach(() => {
  mysqlVariables.forEach((name) => {
    if (originalValues[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = originalValues[name];
    }
  });
});

test('requires the MySQL connection environment variables', () => {
  expect(() => getMysqlPool()).toThrow(
    'Missing MySQL environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD'
  );
});

test('rejects an invalid MySQL port', () => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'test';
  process.env.DB_USER = 'test';
  process.env.DB_PASSWORD = 'test';
  process.env.DB_PORT = 'not-a-port';

  expect(() => getMysqlPool()).toThrow('DB_PORT must be an integer between 1 and 65535');
});
