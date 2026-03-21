# 🔔 Price Alert & Tracker Engine

A backend price monitoring engine that tracks product prices from e-commerce platforms, stores time-series price history, and notifies users via email or webhook when prices drop below their set threshold.

> **Resume line:** Built a price tracking engine monitoring 500+ products with scheduled polling, time-series price history in MySQL, and threshold-based user alerting with Redis deduplication.

---

## 📌 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Testing](#testing)
- [Monitoring Queues](#monitoring-queues)
- [Seeding 500 Products](#seeding-500-products)

---

## Features

- **Product tracking** — Register any product URL to monitor
- **Scheduled scraping** — Cron job polls prices every 15 minutes via Bull job queue
- **Time-series history** — Full price history stored in MySQL with indexed queries
- **Threshold alerts** — Users set a target price; get notified when it's hit
- **Percentage drop alerts** — Trigger when price drops X% from 7-day rolling high
- **Email notifications** — Sent via Nodemailer (Ethereal for local testing)
- **Webhook notifications** — POST JSON payload to any webhook URL
- **Redis deduplication** — Prevents duplicate alerts firing more than once per day
- **Queue monitoring** — Bull Board UI at `/admin/queues`
- **Structured logging** — Winston logs all scrape events and alert fires

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v20 LTS |
| API Framework | Express.js |
| Database | MySQL + Knex.js (ORM + migrations) |
| Job Queue | Bull (Redis-backed) |
| Cache / Dedup | Redis via ioredis (Memurai on Windows) |
| Scheduler | node-cron |
| Scraper | Axios + Cheerio |
| Email | Nodemailer + Ethereal (local) |
| Logging | Winston |
| Validation | Joi |
| Queue UI | @bull-board/express |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     REST Client / UI                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                      Express API                         │
│          /products   /alerts   /admin/queues             │
└──────┬───────────────────┬─────────────────┬────────────┘
       │                   │                 │
┌──────▼──────┐   ┌────────▼───────┐  ┌─────▼──────────┐
│  MySQL DB   │   │  Redis / Bull  │  │  Alert Engine  │
│  products   │   │  Job Queue     │  │  Threshold     │
│  alerts     │   │  Dedup Keys    │  │  Evaluation    │
│  history    │   │  Price Cache   │  └─────┬──────────┘
└──────▲──────┘   └────────┬───────┘        │
       │                   │                │
┌──────┴───────────────────▼──────┐  ┌─────▼──────────┐
│         Scraper Worker          │  │ Notifier Worker │
│  Axios + Cheerio → price_history│  │ Email / Webhook │
└─────────────────────────────────┘  └────────────────┘
                 ▲
┌────────────────┴────────────────┐
│        node-cron Scheduler      │
│   Every 15 min → enqueue jobs   │
└─────────────────────────────────┘
```

---

## Project Structure

```
price-tracker/
├── index.js                  # Entry point — starts server + workers + cron
├── knexfile.js               # MySQL connection config
├── .env                      # Secrets (gitignored)
├── .gitignore
├── package.json
├── src/
│   ├── app.js                # Express setup, middleware, routes
│   ├── routes/
│   │   ├── products.js       # Product endpoints
│   │   └── alerts.js         # Alert endpoints
│   ├── workers/
│   │   ├── scraper.js        # Bull consumer — scrapes & saves price
│   │   └── notifier.js       # Bull consumer — sends email/webhook
│   ├── jobs/
│   │   └── scheduler.js      # node-cron — enqueues products every 15 min
│   ├── services/
│   │   ├── scraper.js        # Axios + Cheerio price extraction
│   │   ├── alertEngine.js    # Compare price vs alerts, enqueue if triggered
│   │   ├── mailer.js         # Nodemailer send functions
│   │   └── cache.js          # ioredis helpers (last price, dedup keys)
│   ├── db/
│   │   └── index.js          # Knex instance export
│   ├── admin/
│   │   └── bullBoard.js      # Bull Board UI at /admin/queues
│   ├── middleware/
│   │   └── validate.js       # Joi validation middleware
│   └── utils/
│       └── logger.js         # Winston logger config
├── migrations/
│   ├── 001_products.js
│   ├── 002_users.js
│   ├── 003_price_history.js
│   └── 004_alerts.js
├── scripts/
│   ├── seed.js               # 10 test products
│   └── seed500.js            # 500 products for scale demo
├── requests/
│   └── test.http             # VS Code REST Client test file
└── logs/                     # Winston output (gitignored)
```

---

## Prerequisites

Make sure the following are installed and running before proceeding:

| Requirement | Version | Check |
|---|---|---|
| Node.js LTS | v20.x | `node -v` |
| npm | 10.x+ | `npm -v` |
| MySQL | 8.x | `mysql -u root -p` |
| Memurai (Redis for Windows) | any | `redis-cli ping` → `PONG` |
| Git | any | `git --version` |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/price-tracker.git
cd price-tracker

# 2. Install all dependencies
npm install

# 3. Copy the environment template
cp .env.example .env
# Then fill in your values (see Configuration section)
```

---

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Server
PORT=3000

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=price_tracker

# Redis (Memurai on Windows — default port)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Email — get these from ethereal.email (free, no real emails sent)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_username
SMTP_PASS=your_ethereal_password

# Scraper poll interval (cron syntax — default: every 15 minutes)
CRON_SCHEDULE=*/15 * * * *
```

> **Note:** Never commit `.env` to Git. It is already in `.gitignore`.

---

## Database Setup

```bash
# 1. Create the database in MySQL
mysql -u root -p -e "CREATE DATABASE price_tracker;"

# 2. Run all migrations
npx knex migrate:latest

# 3. (Optional) Seed 10 test products
node scripts/seed.js
```

Expected tables after migration:

| Table | Description |
|---|---|
| `products` | Products being tracked (URL, name, platform) |
| `users` | Users who set alerts (email, optional webhook URL) |
| `price_history` | Append-only time-series of scraped prices |
| `alerts` | User alert rules (target price or % drop threshold) |

---

## Running the App

```bash
# Development (auto-restart on file save)
npm run dev

# Production
npm start
```

You should see:
```
[INFO] Server running on port 3000
[INFO] Bull scraper worker started
[INFO] Bull notifier worker started
[INFO] Cron scheduler started — polling every 15 minutes
```

---

## API Reference

### Products

#### Register a product to track
```http
POST /products
Content-Type: application/json

{
  "url": "https://www.amazon.in/dp/B09XYZ123",
  "name": "boAt Rockerz 450 Headphones",
  "platform": "amazon"
}
```

#### Get price history for a product
```http
GET /products/:id/history?days=30
```

#### Get price statistics
```http
GET /products/:id/stats
```
Response:
```json
{
  "current": 1299,
  "min": 999,
  "max": 1799,
  "avg": 1423.5,
  "dropFromHigh": "27.8%"
}
```

---

### Alerts

#### Create a price alert
```http
POST /alerts
Content-Type: application/json

{
  "userId": "uuid-here",
  "productId": "uuid-here",
  "targetPrice": 999,
  "dropPct": null
}
```

#### List alerts for a user
```http
GET /alerts?userId=uuid-here
```

#### Delete an alert
```http
DELETE /alerts/:id
```

---

## How It Works

### Scraping Pipeline

1. `node-cron` fires every 15 minutes
2. Scheduler queries all active products and pushes each to the **Bull scrape queue**
3. Scraper worker dequeues a product, fetches the URL with Axios, parses the price with Cheerio
4. Price is inserted into `price_history`
5. Last price is cached in Redis (`product:lastprice:{id}`) with 30-min TTL

### Alert Pipeline

1. After each price insert, `alertEngine.js` queries all active alerts for that product
2. If `newPrice <= alert.targetPrice` (or drop % threshold crossed):
   - Checks Redis dedup key: `alert_fired:{alertId}:{YYYY-MM-DD}`
   - If key **exists** → skip (already fired today)
   - If key **missing** → enqueue notification job + set key with 24-hr TTL
3. Notifier worker sends email via Nodemailer or POSTs to webhook URL

### Deduplication

Redis key pattern: `alert_fired:{alertId}:{date}`  
TTL: 86400 seconds (24 hours)  
This ensures a user receives **at most one alert per product per day**, regardless of how many cron cycles run while the price stays below threshold.

---

## Testing

```bash
# Run integration tests
npm test

# Or test endpoints manually using the VS Code REST Client
# Open: requests/test.http
# Click "Send Request" above any endpoint block
```

---

## Monitoring Queues

Bull Board is mounted at:

```
http://localhost:3000/admin/queues
```

From here you can see:
- Active, waiting, completed, and failed jobs
- Job retry history
- Queue throughput over time

---

## Seeding 500 Products

To prove the scale claim on your resume, run the seed script on Day 7:

```bash
node scripts/seed500.js
```

This inserts 500 products with generated URLs. Then run the app and let one full cron cycle complete — you'll have 500 price history rows and can show the Bull Board processing them.

---

## License

MIT — free to use, modify, and share.
