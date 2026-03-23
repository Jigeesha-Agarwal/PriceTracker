require('dotenv').config();

/**
 * Integration test: full scrape → alert engine → notification pipeline.
 *
 * This is NOT a unit test with mocks — it runs against your real MySQL and Redis.
 * Run it manually with: node tests/integration.test.js
 *
 * Pre-conditions:
 *   1. MySQL running with price_tracker DB + tables created
 *   2. Redis running on localhost:6379
 *   3. At least one product in the products table
 *   4. At least one user in the users table
 */

const db = require('../src/db');
const cache = require('../src/services/cache');
const { scrapeProduct } = require('../src/services/scraper');
const alertEngine = require('../src/services/alertEngine');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== Integration test: Price Tracker pipeline ===\n');

  // ── Test 1: DB connection ────────────────────────────────────────────────
  console.log('1. Database connection');
  try {
    await db.raw('SELECT 1');
    assert(true, 'Connected to MySQL');
  } catch (err) {
    assert(false, `MySQL connect: ${err.message}`);
    process.exit(1);
  }

  // ── Test 2: Redis connection ─────────────────────────────────────────────
  console.log('\n2. Redis connection');
  try {
    await cache.setLastPrice(999999, 1234.56);
    const val = await cache.getLastPrice(999999);
    assert(val === 1234.56, `Redis set/get round-trip (got ${val})`);
    await cache.del('price:999999');
  } catch (err) {
    assert(false, `Redis: ${err.message}`);
  }

  // ── Test 3: Scraper (mock mode) ──────────────────────────────────────────
  console.log('\n3. Scraper (mock mode)');
  try {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      url: 'https://www.amazon.in/dp/TEST',
      current_price: 5000,
    };
    const result = await scrapeProduct(mockProduct, { useMock: true });
    assert(
      typeof result.price === 'number' && result.price > 0,
      `Mock scrape returned price ₹${result.price}`
    );
  } catch (err) {
    assert(false, `Scraper: ${err.message}`);
  }

  // ── Test 4: price_history insert ─────────────────────────────────────────
  console.log('\n4. price_history insert');
  try {
    const product = await db('products').first();
    if (!product) {
      console.log('  ⚠ No products in DB — skipping. Run: node scripts/seed.js');
    } else {
      const before = await db('price_history')
        .where({ product_id: product.id })
        .count('* as c')
        .first();
      await db('price_history').insert({
        product_id: product.id,
        price: 9999.99,
        currency: 'INR',
        recorded_at: new Date(),
      });
      const after = await db('price_history')
        .where({ product_id: product.id })
        .count('* as c')
        .first();
      assert(parseInt(after.c) === parseInt(before.c) + 1, 'price_history row inserted');
    }
  } catch (err) {
    assert(false, `price_history: ${err.message}`);
  }

  // ── Test 5: Alert dedup ──────────────────────────────────────────────────
  console.log('\n5. Alert deduplication');
  try {
    const testAlertId = 88888;
    await cache.markAlertFiredToday(testAlertId);
    const fired = await cache.isAlertFiredToday(testAlertId);
    assert(fired === true, 'Dedup key set and detected');
    const today = new Date().toISOString().slice(0, 10);
    await cache.del(`alert_fired:${testAlertId}:${today}`);
  } catch (err) {
    assert(false, `Dedup: ${err.message}`);
  }

  // ── Test 6: Alert engine (no real alert required — just runs cleanly) ────
  console.log('\n6. Alert engine (dry run)');
  try {
    // Run checkAlerts with a very high price so no real alert fires
    await alertEngine.checkAlerts(0, 999999999);
    assert(true, 'Alert engine ran without error on unknown product');
  } catch (err) {
    assert(false, `Alert engine: ${err.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('─'.repeat(40));

  await db.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
