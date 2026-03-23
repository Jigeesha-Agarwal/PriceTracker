const db = require('../db');
const cache = require('./cache');
const logger = require('../utils/logger');

// Import notification queue lazily to avoid circular deps
let notifyQueue;
function getNotifyQueue() {
  if (!notifyQueue) notifyQueue = require('../workers/notifier');
  return notifyQueue;
}

/**
 * Alert engine — called after every successful price scrape.
 *
 * For each un-fired alert on this product:
 *   1. Check if new_price <= target_price
 *   2. Check Redis dedup key (skip if already fired today)
 *   3. Enqueue a notification job
 *   4. Mark alert as fired in DB + Redis
 *
 * @param {number} productId
 * @param {number} newPrice - freshly scraped price
 */
async function checkAlerts(productId, newPrice) {
  // Find all active (un-fired) alerts for this product where price has dropped
  const triggeredAlerts = await db('alerts')
    .where({ product_id: productId })
    .whereNull('fired_at')
    .where('target_price', '>=', newPrice) // alert triggers when price ≤ target
    .join('users', 'alerts.user_id', 'users.id')
    .select(
      'alerts.id as alert_id',
      'alerts.user_id',
      'alerts.target_price',
      'alerts.webhook_url',
      'users.email',
      'users.notify_via'
    );

  if (triggeredAlerts.length === 0) return;

  logger.info(
    `[alertEngine] ${triggeredAlerts.length} alert(s) triggered for product ${productId} at ₹${newPrice}`
  );

  const product = await db('products').where({ id: productId }).first();

  for (const alert of triggeredAlerts) {
    // ── Dedup check: has this alert already fired today? ──────────────────
    const alreadyFired = await cache.isAlertFiredToday(alert.alert_id);
    if (alreadyFired) {
      logger.info(`[alertEngine] Alert ${alert.alert_id} already fired today — skipping`);
      continue;
    }

    // ── Mark as fired in DB ───────────────────────────────────────────────
    await db('alerts').where({ id: alert.alert_id }).update({
      fired_at: new Date(),
      fired_at_price: newPrice,
    });

    // ── Set Redis dedup key (24-hr TTL) ───────────────────────────────────
    await cache.markAlertFiredToday(alert.alert_id);

    // ── Enqueue notification job ──────────────────────────────────────────
    const notifyPayload = {
      alertId: alert.alert_id,
      userId: alert.user_id,
      email: alert.email,
      productId,
      productName: product.name,
      productUrl: product.url,
      targetPrice: alert.target_price,
      currentPrice: newPrice,
      webhookUrl: alert.webhook_url || null,
      notifyVia: alert.notify_via ? JSON.parse(alert.notify_via) : ['email'],
    };

    await getNotifyQueue().add(notifyPayload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 20,
    });

    logger.info(
      `[alertEngine] Notification enqueued for alert ${alert.alert_id} (user ${alert.user_id})`
    );
  }
}

module.exports = { checkAlerts };
