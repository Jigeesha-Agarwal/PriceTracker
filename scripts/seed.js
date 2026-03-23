require('dotenv').config();
const db = require('../src/db');

/**
 * Seed script — inserts 10 realistic test products + 8 days of price history.
 * Run with: node scripts/seed.js
 * Safe to re-run: uses onConflict().ignore() on the unique URL column.
 */

const products = [
  {
    name: 'Apple iPhone 15 (128GB, Black)',
    url: 'https://www.amazon.in/dp/B0CHX1W1XY',
    source: 'amazon',
    current_price: 74900.0,
    poll_interval_minutes: 30,
  },
  {
    name: 'Samsung Galaxy S24 (8GB/128GB)',
    url: 'https://www.flipkart.com/samsung-galaxy-s24/p/fake-pid-001',
    source: 'flipkart',
    current_price: 74999.0,
    poll_interval_minutes: 60,
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    url: 'https://www.amazon.in/dp/B09XS7JWHH',
    source: 'amazon',
    current_price: 26990.0,
    poll_interval_minutes: 60,
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    url: 'https://www.amazon.in/dp/B09HM94VDS',
    source: 'amazon',
    current_price: 8995.0,
    poll_interval_minutes: 120,
  },
  {
    name: 'LG 27GP850-B 27" QHD Monitor',
    url: 'https://www.flipkart.com/lg-27gp850-b-monitor/p/fake-pid-002',
    source: 'flipkart',
    current_price: 32999.0,
    poll_interval_minutes: 120,
  },
  {
    name: 'Kindle Paperwhite (16GB)',
    url: 'https://www.amazon.in/dp/B09TMF6745',
    source: 'amazon',
    current_price: 14999.0,
    poll_interval_minutes: 240,
  },
  {
    name: 'boAt Airdopes 141 Earbuds',
    url: 'https://www.flipkart.com/boat-airdopes-141/p/fake-pid-003',
    source: 'flipkart',
    current_price: 1299.0,
    poll_interval_minutes: 60,
  },
  {
    name: 'Crucial P3 1TB NVMe SSD',
    url: 'https://www.amazon.in/dp/B0B25LQQPC',
    source: 'amazon',
    current_price: 5499.0,
    poll_interval_minutes: 120,
  },
  {
    name: 'Nike Air Max 270 (Size 9)',
    url: 'https://www.flipkart.com/nike-air-max-270/p/fake-pid-004',
    source: 'flipkart',
    current_price: 10995.0,
    poll_interval_minutes: 360,
  },
  {
    name: 'Prestige Iris 750W Mixer Grinder',
    url: 'https://www.amazon.in/dp/B07JF4ZS82',
    source: 'amazon',
    current_price: 2595.0,
    poll_interval_minutes: 360,
  },
];

async function seed() {
  console.log('\n🌱 Seeding products...\n');

  for (const p of products) {
    try {
      await db('products').insert(p).onConflict('url').ignore();
      console.log(`  ✓ ${p.name}`);
    } catch (err) {
      console.error(`  ✗ ${p.name} —`, err.message);
    }
  }

  // Seed 8 days of price history per product so charts have data
  console.log('\n🌱 Seeding price history...\n');

  const inserted = await db('products').select('id', 'name', 'current_price');

  for (const p of inserted) {
    const rows = [];
    const base = parseFloat(p.current_price);

    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
      const variance = Math.random() * 0.06 - 0.03; // ±3%
      const price = parseFloat((base * (1 + variance)).toFixed(2));
      const recorded = new Date();
      recorded.setDate(recorded.getDate() - daysAgo);
      recorded.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

      rows.push({ product_id: p.id, price, currency: 'INR', recorded_at: recorded });
    }

    await db('price_history').insert(rows);
    console.log(`  ✓ ${p.name} — ${rows.length} history rows`);
  }

  console.log('\n✅ Seed complete.\n');
  await db.destroy();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
