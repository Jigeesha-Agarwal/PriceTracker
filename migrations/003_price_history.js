/**
 * Migration 003: price_history
 *
 * Append-only time-series — never UPDATE or DELETE rows here.
 *
 * Key query patterns:
 *   Latest price:    SELECT price FROM price_history WHERE product_id=? ORDER BY recorded_at DESC LIMIT 1
 *   30-day chart:    SELECT price, recorded_at WHERE product_id=? AND recorded_at >= NOW() - INTERVAL 30 DAY
 *   All-time low:    SELECT MIN(price) WHERE product_id=?
 */
exports.up = function (knex) {
  return knex.schema.createTable('price_history', t => {
    // Integer PK — faster inserts than UUID on append-only tables
    t.bigIncrements('id');

    t.integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');

    t.decimal('price', 12, 2).notNullable();
    t.string('currency', 8).notNullable().defaultTo('INR');
    t.boolean('is_sale').notNullable().defaultTo(false);
    t.string('raw_price_text', 64).nullable(); // e.g. "₹1,299" — useful for debugging

    t.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());

    // Critical index — all price chart queries filter on this
    t.index(['product_id', 'recorded_at'], 'idx_price_history_product_time');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('price_history');
};
