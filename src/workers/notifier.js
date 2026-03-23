const Bull = require('bull');
const axios = require('axios');
const crypto = require('crypto');
const { sendAlertEmail } = require('../services/mailer');
const logger = require('../utils/logger');

/**
 * Bull queue: notifyQueue
 *
 * Each job payload:
 *   { alertId, userId, email, productId, productName, productUrl,
 *     targetPrice, currentPrice, webhookUrl, notifyVia }
 *
 * Supports two notification channels:
 *   - email:   sends via Nodemailer (Ethereal in dev)
 *   - webhook: POSTs a signed JSON payload to webhookUrl
 */

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const notifyQueue = new Bull('notifyQueue', { redis: REDIS_CONFIG });

notifyQueue.process(async job => {
  const {
    alertId,
    email,
    productName,
    productUrl,
    targetPrice,
    currentPrice,
    webhookUrl,
    notifyVia,
  } = job.data;

  logger.info(`[notifyWorker] Processing notification for alert ${alertId}`);

  const channels = notifyVia || ['email'];

  // ── Email ──────────────────────────────────────────────────────────────────
  if (channels.includes('email') && email) {
    try {
      await sendAlertEmail({ to: email, productName, productUrl, targetPrice, currentPrice });
      logger.info(`[notifyWorker] Email sent for alert ${alertId}`);
    } catch (err) {
      logger.error(`[notifyWorker] Email failed for alert ${alertId}: ${err.message}`);
      throw err; // let Bull retry
    }
  }

  // ── Webhook ────────────────────────────────────────────────────────────────
  if (channels.includes('webhook') && webhookUrl) {
    try {
      const payload = {
        event: 'price_drop',
        alertId,
        product: productName,
        productUrl,
        targetPrice,
        currentPrice,
        dropAmount: parseFloat((targetPrice - currentPrice).toFixed(2)),
        dropPercent: parseFloat((((targetPrice - currentPrice) / targetPrice) * 100).toFixed(2)),
        triggeredAt: new Date().toISOString(),
      };

      const body = JSON.stringify(payload);
      const secret = process.env.WEBHOOK_SECRET || 'default-secret';
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-PriceTracker-Sig': `sha256=${signature}`,
        },
        timeout: 8000,
      });

      logger.info(`[notifyWorker] Webhook delivered for alert ${alertId} → ${webhookUrl}`);
    } catch (err) {
      logger.error(`[notifyWorker] Webhook failed for alert ${alertId}: ${err.message}`);
      throw err; // let Bull retry
    }
  }
});

// ─── Queue event hooks ────────────────────────────────────────────────────────

notifyQueue.on('failed', (job, err) => {
  logger.error(`[notifyWorker] Job ${job.id} failed after all retries: ${err.message}`);
});

notifyQueue.on('completed', job => {
  logger.info(`[notifyWorker] Job ${job.id} completed`);
});

module.exports = notifyQueue;
