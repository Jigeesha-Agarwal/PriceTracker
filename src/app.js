require('dotenv').config();
const express = require('express');

const productsRouter = require('./routes/products');
const alertsRouter   = require('./routes/alerts');

const app = express();
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use('/products', productsRouter);
app.use('/alerts',   alertsRouter);

// ─── Global error handler ────────────────────────────────────────────────────
// Must be the LAST app.use() — 4 params = Express error handler signature
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error('[error]', err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;