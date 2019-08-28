/*
 *Primary file for the API
 *
 * 
 * File number 2:  config.js
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
// Declare the app
const app = {};

// Init function
app.init = function () {
  // start the server
  server.init();

  // Start the workers
  // workers.init();
}

// Execute server
app.init();

// Export the app
module.exports = app;