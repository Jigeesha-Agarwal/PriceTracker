require('dotenv').config();
require('./src/db'); // trigger DB connection check on startup

const app = require('./src/app');
const PORT = process.env.PORT || 3000;

// Start Bull Board admin UI (Day 6 — safe to import even if not yet wired)
try {
  require('./src/admin/bullBoard')(app);
} catch (_) {
  // bullBoard.js is empty until Day 6 — ignore
}

// Start scheduler (Day 3 — safe to import even if not yet implemented)
try {
  require('./src/jobs/scheduler');
} catch (_) {
  // scheduler.js is empty until Day 3 — ignore
}

const server = app.listen(PORT, () => {
  console.log(`[app] Listening on http://localhost:${PORT}`);
});

// Graceful shutdown (Day 6 polish)
process.on('SIGTERM', () => {
  console.log('[app] SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});
