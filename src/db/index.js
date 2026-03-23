require('dotenv').config();
const knex = require('knex');
const config = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';

const db = knex(config[env]);

db.raw('SELECT 1')
  .then(() => console.log(`[db] Connected to MySQL (${env})`))
  .catch(err => {
    console.error('[db] MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;
