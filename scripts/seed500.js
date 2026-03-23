require('dotenv').config();
const db = require('../src/db');

/**
 * Seed 500 products for Day 7 demo.
 * Run with: node scripts/seed500.js
 */

const SOURCES = ['amazon', 'flipkart'];
const CATEGORIES = [
  { name: 'Smartphone', basePrice: 15000 },
  { name: 'Laptop', basePrice: 60000 },
  { name: 'Headphones', basePrice: 3000 },
  { name: 'Smartwatch', basePrice: 8000 },
  { name: 'Tablet', basePrice: 25000 },
  { name: 'Camera', basePrice: 45000 },
  { name: 'Monitor', basePrice: 20000 },
  { name: 'Keyboard', basePrice: 2500 },
  { name: 'Mouse', basePrice: 1800 },
  { name: 'Speaker', basePrice: 5000 },
];

async function seed500() {
  console.log('\n🌱 Seeding 500 products...\n');

  const rows = [];
  for (let i = 1; i <= 500; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const source = SOURCES[i % SOURCES.length];
    const price = parseFloat((cat.basePrice * (0.8 + Math.random() * 0.4)).toFixed(2));

    rows.push({
      name: `${cat.name} Model ${i}`,
      url: `https://www.${source}.in/dp/FAKE${String(i).padStart(6, '0')}`,
      source,
      current_price: price,
      poll_interval_minutes: [15, 30, 60, 120][i % 4],
      active: true,
    });
  }

  // Insert in batches of 50 to avoid hitting MySQL packet limits
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db('products').insert(batch).onConflict('url').ignore();
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/500...`);
  }

  console.log('\n\n✅ 500 products seeded.\n');
  await db.destroy();
}

seed500().catch(err => {
  console.error('Seed500 failed:', err);
  process.exit(1);
});
