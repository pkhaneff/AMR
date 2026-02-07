const express = require('express');
const amrRouter = require('./v1/amr.routes');

function setupRoutes(app) {
  app.use('/api/v1/amr', amrRouter);
}

module.exports = setupRoutes;
