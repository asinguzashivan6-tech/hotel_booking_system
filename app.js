'use strict';

const path = require('path');
const cors = require('cors');
const express = require('express');

const defaultRepositories = require('./repositories');
const { createServices } = require('./services');
const createApiRouter = require('./routes');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Application factory.
 *
 * Passing repositories is intentional: the automated tests inject fast
 * in-memory repositories, while server.js uses the real MongoDB repositories.
 */
function createApp({ repositories = defaultRepositories } = {}) {
  const services = createServices(repositories);
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  app.use('/api', createApiRouter(services));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use(apiNotFound);

  // Client-side routes (if a SPA route is added later) fall back to index.html.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
