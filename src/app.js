require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const alertsRouter = require('./routes/alerts');
const usersRouter = require('./routes/users');

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));
app.use('/products', productsRouter);
app.use('/alerts', alertsRouter);
app.use('/users', usersRouter);

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error('[error]', err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
