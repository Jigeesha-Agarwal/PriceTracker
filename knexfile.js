// knexfile.js
require('dotenv').config();

module.exports = {

    // ─── Development ──────────────────────────
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'jagarwal',
            password: process.env.DB_PASS || 'mangal30',
            database: process.env.DB_NAME || 'price_tracker'
        },
        migrations: {
            directory: './migrations'
        },
        seeds: {
            directory: './scripts'
        }
    },

    // ─── Production ───────────────────────────
    production: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        },
        migrations: {
            directory: './migrations'
        }
    }

};