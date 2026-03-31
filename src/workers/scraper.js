const Bull = require('bull');
const db = require('../db');
const cache = require('../services/cache');
const { scrapeProduct } = require('../services/scraper');
const alertEngine = require('../services/alertEngine');
const logger = require('../utils/logger');

/**
 * Bull queue: scrapeQueue
 *
 * Each job payload: { productId: number }
 *
 * Worker flow:
 *   1. Load product from DB
 *   2. Scrape the page (mock by default)
 *   3. Write price to price_history
 *   4. Update products.current_price + last_scraped_at
 *   5. Cache the new price in Redis (30-min TTL)
 *   6. Run alert engine to check for threshold crossings
 */

// const REDIS_CONFIG = {
//   host: process.env.REDIS_HOST || '127.0.0.1',
//   port: parseInt(process.env.REDIS_PORT) || 6379,
//   password: process.env.REDIS_PASSWORD || undefined,
// };

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const scrapeQueue = new Bull(
  'scrapeQueue',
  process.env.REDIS_URL ? { redis: process.env.REDIS_URL } : { redis: REDIS_CONFIG }
);

const scrapeQueue = new Bull('scrapeQueue', { redis: REDIS_CONFIG });

scrapeQueue.process(async job => {
  const { productId } = job.data;
  logger.info(`[scrapeWorker] Processing product ${productId}`);

  // 1. Load product
  const product = await db('products').where({ id: productId, active: true }).first();
  if (!product) {
    logger.warn(`[scrapeWorker] Product ${productId} not found or inactive — skipping`);
    return;
  }

  // 2. Scrape
  const { price, name, rawText } = await scrapeProduct(product, { useMock: true });

  // 3. Append to price_history
  await db('price_history').insert({
    product_id: productId,
    price,
    currency: 'INR',
    raw_price_text: rawText,
    recorded_at: new Date(),
  });

  // 4. Update products table with latest price
  const updates = { current_price: price, last_scraped_at: new Date() };
  if (name && !product.name) updates.name = name; // fill in name on first scrape
  await db('products').where({ id: productId }).update(updates);

  // 5. Cache the new price
  await cache.setLastPrice(productId, price);

  logger.info(`[scrapeWorker] Product ${productId} scraped → ₹${price}`);

  // 6. Check alerts
  await alertEngine.checkAlerts(productId, price);
});

// ─── Queue event hooks ────────────────────────────────────────────────────────

scrapeQueue.on('failed', (job, err) => {
  logger.error(
    `[scrapeWorker] Job ${job.id} (product ${job.data.productId}) failed: ${err.message}`
  );
});

scrapeQueue.on('completed', job => {
  logger.info(`[scrapeWorker] Job ${job.id} completed`);
});

module.exports = scrapeQueue;
