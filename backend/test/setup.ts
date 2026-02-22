// Must run before any import that loads db (e.g. app)
process.env.SQLITE_PATH = ':memory:';
process.env.NODE_ENV = 'test';
