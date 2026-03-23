const express = require('express');
const db = require('../db');
const { validate, productSchema } = require('../middleware/validate');

const router = express.Router();

// ─── POST /products ──────────────────────────────────────────────────────────
// Register a product URL to track
router.post('/', validate(productSchema), async (req, res, next) => {
  try {
    const { url, name, source, poll_interval_minutes } = req.body;

    // Upsert: if URL already tracked, return existing row
    const existing = await db('products').where({ url }).first();
    if (existing) {
      return res.status(200).json({ message: 'Already tracked', product: existing });
    }

    const [id] = await db('products').insert({ url, name, source, poll_interval_minutes });
    const product = await db('products').where({ id }).first();
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// ─── GET /products ───────────────────────────────────────────────────────────
// List all active products
router.get('/', async (req, res, next) => {
  try {
    const products = await db('products').where({ active: true }).orderBy('created_at', 'desc');
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// ─── GET /products/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── GET /products/:id/price-history ─────────────────────────────────────────
// Time-series prices — last N days (default 30)
router.get('/:id/price-history', async (req, res, next) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days) || 30;

    const product = await db('products').where({ id }).first();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const history = await db('price_history')
      .where('product_id', id)
      .where('recorded_at', '>=', db.raw(`NOW() - INTERVAL ${days} DAY`))
      .orderBy('recorded_at', 'asc')
      .select('price', 'currency', 'is_sale', 'recorded_at');

    res.json({ product_id: id, days, history });
  } catch (err) {
    next(err);
  }
});

// ─── GET /products/:id/stats ──────────────────────────────────────────────────
// Min, max, avg, current price + drop % over N days (Day 5)
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days) || 30;

    const product = await db('products').where({ id }).first();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const [stats] = await db('price_history')
      .where('product_id', id)
      .where('recorded_at', '>=', db.raw(`NOW() - INTERVAL ${days} DAY`))
      .select(
        db.raw('MIN(price) as min_price'),
        db.raw('MAX(price) as max_price'),
        db.raw('AVG(price) as avg_price'),
        db.raw('COUNT(*) as data_points')
      );

    const current = product.current_price;
    const max_price = parseFloat(stats.max_price) || current;
    const drop_pct =
      max_price > 0 ? (((max_price - current) / max_price) * 100).toFixed(2) : '0.00';

    res.json({
      product_id: id,
      days,
      current_price: current,
      min_price: parseFloat(stats.min_price) || null,
      max_price: parseFloat(stats.max_price) || null,
      avg_price: stats.avg_price ? parseFloat(parseFloat(stats.avg_price).toFixed(2)) : null,
      data_points: parseInt(stats.data_points),
      drop_pct_from_high: parseFloat(drop_pct),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
