const cron = require('node-cron');
const db = require('../db');
const scrapeQueue = require('../workers/scraper');
const logger = require('../utils/logger');

/**
 * Scheduler — runs every 15 minutes.
 *
 * Queries all active products and enqueues a scrape job for each one.
 * Bull handles concurrency and retries; the scheduler only enqueues.
 *
 * Why not a single "scrape all products" job?
 * Separate jobs per product means one failure doesn't block others,
 * Bull's retry/backoff applies per product, and Bull Board shows
 * per-product job history.
 */

const CRON_EXPRESSION = process.env.SCRAPE_CRON || '*/15 * * * *'; // every 15 min

let isSchedulerRunning = false;

async function enqueueScrapeJobs() {
  if (isSchedulerRunning) {
    logger.warn('[scheduler] Previous run still in progress — skipping this tick');
    return;
  }

  isSchedulerRunning = true;

  try {
    const products = await db('products')
      .where({ active: true })
      .select('id', 'name', 'poll_interval_minutes');

    logger.info(`[scheduler] Enqueueing ${products.length} products for scraping`);

    for (const product of products) {
      await scrapeQueue.add(
        { productId: product.id },
        {
          attempts: 3, // retry up to 3× on failure
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 50, // keep last 50 completed jobs in Bull Board
          removeOnFail: false, // keep failed jobs for inspection
          jobId: `scrape-${product.id}-${Date.now()}`, // unique per tick
        }
      );
    }

    logger.info(`[scheduler] ${products.length} jobs enqueued`);
  } catch (err) {
    logger.error(`[scheduler] Error enqueueing jobs: ${err.message}`);
  } finally {
    isSchedulerRunning = false;
  }
}

// Schedule the cron job
const task = cron.schedule(CRON_EXPRESSION, enqueueScrapeJobs, {
  scheduled: true,
  timezone: 'Asia/Kolkata',
});

logger.info(`[scheduler] Started — cron: "${CRON_EXPRESSION}"`);

// Run once immediately on startup so you don't wait 15 min to see it work
enqueueScrapeJobs();

module.exports = task;
