if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'jagarwal',
      password: process.env.DB_PASS || 'mangal30',
      database: process.env.DB_NAME || 'price_tracker',
    },
    migrations: { directory: './migrations' },
    seeds: { directory: './scripts' },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
    },
    migrations: { directory: './migrations' },
  },
};
