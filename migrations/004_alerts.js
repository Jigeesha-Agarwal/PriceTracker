/**
 * Migration 004: alerts
 *
 * A user's price drop alert for a specific product.
 * Fires when current_price <= target_price.
 *
 * fired_at = NULL  → alert is live (not yet triggered)
 * fired_at = date  → alert has fired (kept for history; can be re-armed)
 */
exports.up = function (knex) {
  return knex.schema.createTable('alerts', t => {
    t.increments('id').primary();

    t.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    t.integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');

    t.decimal('target_price', 12, 2).notNullable();
    t.string('currency', 8).notNullable().defaultTo('INR');

    // NULL = active; timestamp = fired
    t.timestamp('fired_at').nullable().defaultTo(null);
    t.decimal('fired_at_price', 12, 2).nullable();

    // Optional per-alert webhook override
    t.string('webhook_url', 2048).nullable();

    // Prevent duplicate alerts for same user+product+target
    t.unique(['user_id', 'product_id', 'target_price'], 'uq_alert_user_product_price');

    // "Find all un-fired alerts for product X" — used every cron tick
    t.index(['product_id', 'fired_at'], 'idx_alerts_product_unfired');

    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alerts');
};
