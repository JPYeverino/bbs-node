/*
 * Server-related tasks
 *
 */

//Dependencies - node.js does not support ES6 modules!!!
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./redisHandlers');
const helpers = require('./helpers');
const redisClient = require('./redisServer');
const path = require('path');

// Instantiate the server module object
const server = {};


// Instantiate HTTP redis client
server.httpRedisCient = redisClient;

// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
  server.unifiedServer(req, res);
});

//  All the server logic for both the http and https server
server.unifiedServer = function (req, res) {
  /* Get the URL and parse it */
  let parsedUrl = url.parse(req.url, true);

  /* Get the path */
  let path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  /* Get tue query string as an object */
  let queryStringObject = parsedUrl.query;

  /* Get the HTTP Method */
  let method = req.method.toLowerCase();

  /* Get the headers as an object */
  let headers = req.headers;

  // Get the payload, if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();
    //Choose the handler this request should go to. If one is not found, then send not found handler.
    let chooseHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // If the request is within the public directory, use the public handler instead
    chooseHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chooseHandler;
    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      'payload': helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler specified in the router.
    chooseHandler(data, function (statusCode, payload, contentType) {
      // Determine the type of response (fallback to JSON)
      contentType = typeof (contentType) === 'string' ? contentType : 'json';

      // Use the status code called back by the handler, or default to 200
      statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

      // Convert the payload to a string
      let payloadString = '';
      
      // Return the response-parts that are content-specific
      if (contentType == 'json') {
        res.setHeader('Content-Type', 'application/json');
        // Use the payload called back by the handler, or default to an empty object
        payload = typeof (payload) == 'object' ? payload : {};
        // Convert the payload to a string
        payloadString = JSON.stringify(payload);
      }

      if (contentType === 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = typeof(payload) == 'string' ? payload : '';
      }

      if (contentType === 'favicon') {
        res.setHeader('Content-Type', 'image/x-icon');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if (contentType === 'css') {
        res.setHeader('Content-Type', 'text/css');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if (contentType === 'png') {
        res.setHeader('Content-Type', 'image/png');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if (contentType === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if (contentType === 'plain') {
        res.setHeader('Content-Type', 'text/plain');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      // Return the response-parts that are common to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

    });

  });

};

// Define a request router
server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'messages/all': handlers.messagesList,
  'messages/create': handlers.messagesCreate,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/messages': handlers.messages,
  'favicon.ico' : handlers.favicon,
  'public' : handlers.public
};

// Init script
server.init = function () {

  //Start the HTTP server
  server.httpServer.listen(config.httpPort, () => console.log('The server is listening on port: ' + config.httpPort));

  // Start the HTTP redis client
  server.httpRedisCient.on('connect', () => { console.log('Redis client connected') });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => console.log('The server is listening on port: ' + config.httpsPort));

}

// Export the module
module.exports = server;