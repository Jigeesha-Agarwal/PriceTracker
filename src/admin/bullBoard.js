const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

/**
 * Bull Board admin UI.
 * Mounts a live dashboard at /admin/queues showing queue stats and job history.
 *
 * Usage: require('./admin/bullBoard')(app)  — called from server.js
 *
 * Visit http://localhost:3000/admin/queues after starting the server.
 */
module.exports = function mountBullBoard(app) {
  // Import queues AFTER they've been initialised in server.js
  const scrapeQueue = require('../workers/scraper');
  const notifyQueue = require('../workers/notifier');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(scrapeQueue), new BullAdapter(notifyQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  console.log('[bullBoard] UI available at http://localhost:3000/admin/queues');
};
