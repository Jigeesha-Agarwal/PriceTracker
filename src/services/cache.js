const Redis = require('ioredis');

/**
 * Redis cache service using ioredis (the package you already have installed).
 *
 * Two responsibilities:
 *  1. Last-price cache per product (30-min TTL) — avoids a DB read on every scrape
 *  2. Alert dedup keys (24-hr TTL) — prevents firing the same alert multiple times per day
 */

// const client = new Redis({
//   host: process.env.REDIS_HOST || '127.0.0.1',
//   port: parseInt(process.env.REDIS_PORT) || 6379,
//   password: process.env.REDIS_PASSWORD || undefined,
//   maxRetriesPerRequest: 3,
//   enableReadyCheck: true,
//   lazyConnect: false,
// });

const client = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

client.on('connect', () => console.log('[redis] Connected'));
client.on('error', err => console.error('[redis] Error:', err.message));

// ─── Last-price cache ─────────────────────────────────────────────────────────

const PRICE_TTL = 60 * 30; // 30 minutes

/**
 * Store the latest scraped price for a product.
 * @param {number} productId
 * @param {number} price
 */
async function setLastPrice(productId, price) {
  await client.set(`price:${productId}`, String(price), 'EX', PRICE_TTL);
}

/**
 * Get the cached last price for a product.
 * Returns null if not cached (caller should fall back to DB).
 * @param {number} productId
 * @returns {number|null}
 */
async function getLastPrice(productId) {
  const val = await client.get(`price:${productId}`);
  return val !== null ? parseFloat(val) : null;
}

// ─── Alert deduplication ──────────────────────────────────────────────────────

const DEDUP_TTL = 60 * 60 * 24; // 24 hours

/**
 * Returns true if this alert has already been fired today (dedup key exists).
 * @param {number} alertId
 * @returns {boolean}
 */
async function isAlertFiredToday(alertId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `alert_fired:${alertId}:${today}`;
  const exists = await client.exists(key);
  return exists === 1;
}

/**
 * Mark an alert as fired for today (sets dedup key with 24-hr TTL).
 * @param {number} alertId
 */
async function markAlertFiredToday(alertId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `alert_fired:${alertId}:${today}`;
  await client.set(key, '1', 'EX', DEDUP_TTL);
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Delete a cache key (e.g. when a product is deactivated).
 */
async function del(key) {
  await client.del(key);
}

/**
 * Expose the raw Redis client for Bull queue connections.
 */
function getClient() {
  return client;
}

module.exports = {
  setLastPrice,
  getLastPrice,
  isAlertFiredToday,
  markAlertFiredToday,
  del,
  getClient,
};
