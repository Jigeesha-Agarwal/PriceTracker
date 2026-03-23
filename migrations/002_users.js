/**
 * Migration 002: users
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', t => {
    t.increments('id').primary();

    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 255).nullable();

    // Notification preferences — stored as JSON: ["email", "webhook"]
    t.json('notify_via').nullable();

    // Optional webhook endpoint (payloads signed with HMAC-SHA256)
    t.string('webhook_url', 2048).nullable();
    t.string('webhook_secret', 255).nullable();

    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
