const express = require('express');
const db = require('../db');
const { validate, alertSchema } = require('../middleware/validate');

const router = express.Router();

// ─── POST /alerts ─────────────────────────────────────────────────────────────
// Create a price drop alert
router.post('/', validate(alertSchema), async (req, res, next) => {
  try {
    const { user_id, product_id, target_price, webhook_url } = req.body;

    const product = await db('products').where({ id: product_id }).first();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Prevent duplicates (same user + product + target)
    const existing = await db('alerts').where({ user_id, product_id, target_price }).first();
    if (existing) {
      return res.status(409).json({ error: 'Alert already exists', alert: existing });
    }

    const [id] = await db('alerts').insert({ user_id, product_id, target_price, webhook_url });
    const alert = await db('alerts').where({ id }).first();
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

// ─── GET /alerts?userId= ──────────────────────────────────────────────────────
// List alerts for a user (active ones by default)
router.get('/', async (req, res, next) => {
  try {
    const { userId, includefired } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });

    let query = db('alerts')
      .where('user_id', userId)
      .join('products', 'alerts.product_id', 'products.id')
      .select(
        'alerts.*',
        'products.name as product_name',
        'products.url as product_url',
        'products.current_price'
      )
      .orderBy('alerts.created_at', 'desc');

    if (!includefired) {
      query = query.whereNull('alerts.fired_at');
    }

    const alerts = await query;
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

// ─── GET /alerts/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await db('alerts').where({ id: req.params.id }).first();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /alerts/:id ───────────────────────────────────────────────────────
// Hard delete: permanently removes the alert row from the database
router.delete('/:id', async (req, res, next) => {
  try {
    const alert = await db('alerts').where({ id: req.params.id }).first();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await db('alerts').where({ id: req.params.id }).delete();
    res.json({ message: 'Alert deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
