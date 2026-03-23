const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Scraper service.
 *
 * Real Amazon/Flipkart pages block headless requests immediately.
 * For the demo we use a mock HTML page — replace the `mockHtml` section
 * with Playwright calls when you're ready to scrape real pages.
 *
 * The function returns: { price: number, name: string|null, raw: string }
 */

// ─── Selector map per source ──────────────────────────────────────────────────
// Update these CSS selectors if the actual site HTML changes.
const SELECTORS = {
  amazon: {
    price: '#corePriceDisplay_desktop_feature_div .a-price-whole, .a-price-whole',
    name: '#productTitle',
  },
  flipkart: {
    price: '._30jeq3._16Jk6d, ._30jeq3',
    name: '.B_NuCI',
  },
  custom: {
    price: '[data-price], .price, .product-price',
    name: 'h1',
  },
};

/**
 * Detect retailer from URL.
 * @param {string} url
 * @returns {'amazon'|'flipkart'|'custom'}
 */
function detectSource(url) {
  if (url.includes('amazon')) return 'amazon';
  if (url.includes('flipkart')) return 'flipkart';
  return 'custom';
}

/**
 * Parse a price string like "₹74,900" or "1,299.00" into a float.
 * @param {string} raw
 * @returns {number|null}
 */
function parsePrice(raw) {
  if (!raw) return null;
  // Strip currency symbols, whitespace, and commas; keep digits and decimal
  const cleaned = raw.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Generate mock HTML for a product so cron jobs work without hitting real sites.
 * Prices fluctuate ±5% on every call to simulate real scraping.
 * @param {number} basePrice
 * @param {string} productName
 */
function generateMockHtml(basePrice, productName) {
  const variance = 1 + (Math.random() * 0.1 - 0.05); // ±5%
  const price = (basePrice * variance).toFixed(0);
  return `
    <html><body>
      <h1 id="productTitle">${productName || 'Mock Product'}</h1>
      <div class="a-price-whole">${price}</div>
      <div class="_30jeq3">₹${price}</div>
    </body></html>
  `;
}

/**
 * Scrape a product page and return the price.
 *
 * @param {object} product - Row from the products table
 * @param {object} [opts]
 * @param {boolean} [opts.useMock=true] - Use mock HTML instead of real HTTP (set false in production)
 * @returns {Promise<{price: number, name: string|null, rawText: string}>}
 */
async function scrapeProduct(product, { useMock = true } = {}) {
  const source = detectSource(product.url);
  const selectors = SELECTORS[source] || SELECTORS.custom;

  let html;

  if (useMock) {
    // ── MOCK MODE ──────────────────────────────────────────────────────────
    // Generates deterministic-ish HTML so you can test the full pipeline
    // without hitting real sites or getting IP-banned during development.
    html = generateMockHtml(product.current_price || 1000, product.name);
    logger.info(`[scraper] MOCK scrape for product ${product.id} (${product.name})`);
  } else {
    // ── REAL MODE ──────────────────────────────────────────────────────────
    // Rotates user-agents and adds a random delay to be polite.
    const USER_AGENTS = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0 Safari/537.36',
    ];
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const delay = 2000 + Math.random() * 3000; // 2–5 s random delay

    await new Promise(r => setTimeout(r, delay));

    const response = await axios.get(product.url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'en-IN,en;q=0.9' },
      timeout: 10000,
    });
    html = response.data;
  }

  // ── Parse HTML ─────────────────────────────────────────────────────────────
  const $ = cheerio.load(html);

  const rawPriceText = $(selectors.price).first().text().trim();
  const price = parsePrice(rawPriceText);
  const name = $(selectors.name).first().text().trim() || null;

  if (price === null) {
    throw new Error(
      `Could not parse price from page (selector: ${selectors.price}, raw: "${rawPriceText}")`
    );
  }

  logger.info(`[scraper] product ${product.id} → ₹${price}`);

  return { price, name, rawText: rawPriceText };
}

module.exports = { scrapeProduct, detectSource, parsePrice };
