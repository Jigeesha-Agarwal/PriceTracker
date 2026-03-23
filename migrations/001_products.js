/**
 * Migration 001: products
 *
 * Stores every product URL being tracked.
 * One row per unique URL — multiple users may watch the same product.
 *
 * NOTE on url length:
 *   MySQL (utf8mb4) uses 4 bytes/char. Max index key = 3072 bytes.
 *   So the max VARCHAR length for a unique-indexed column = 3072 / 4 = 768.
 *   VARCHAR(2048) would require 8192 bytes → "Specified key was too long" error.
 */
exports.up = function (knex) {
  return knex.schema.createTable('products', (t) => {
    t.increments('id').primary();

    // 768 chars max — fits any real-world URL and stays within MySQL's index limit
    t.string('url', 768).notNullable().unique();
    t.string('name', 512).nullable();
    t.string('source', 64).notNullable().defaultTo('unknown'); // 'amazon' | 'flipkart' | 'custom'

    // Denormalised latest price — avoids a subquery on every alert check
    t.decimal('current_price', 12, 2).nullable();

    t.boolean('active').notNullable().defaultTo(true);
    t.integer('poll_interval_minutes').notNullable().defaultTo(60);
    t.timestamp('last_scraped_at').nullable();

    t.string('image_url', 500).nullable(); // no index needed, 500 is fine

    t.timestamps(true, true); // created_at, updated_at
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};