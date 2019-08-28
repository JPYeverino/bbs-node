/*
 * Library for managing data with Redis
 * 
 */

//  Dependencies
const redisClient = require('./redisServer');


// Container for Redis Data module
const redisLib = {};

// Write a document (HASH)
redisLib.create = function (collection, id, data, callback) {

  // Look for an already created document
  let hashKey = `${collection}:${id}`;

  redisClient.hgetall(hashKey, function (err, res) {
    // If the document does not exist, create it.
    if (!res) {
      let keyValArr = Object.entries(data);
      keyValArr.forEach(prop => {
        if(prop[0] === 'category') {
          redisClient.sadd('category', prop[1], err => {
            if (err) {
              callback('Error writing category');
            }
          });
        }
        redisClient.hmset(hashKey, prop[0], prop[1], (err) => {
          if (err) {
            callback('Error writing property')
          }
        })
      });
      callback(false)
    } else {
      callback('Could not create new document, it may already exists');
    }
  });
};

// Read a redis document
redisLib.read = function (collection, id, callback) {
  let hashKey = `${collection}:${id}`;
  // Lookup for document
  redisClient.hgetall(hashKey, function (err, reply) {
    // Return document if it exists
    if (!err && reply) {
      callback(false, reply);
    } else {
      callback(err, reply);
    }
  });
};

// Update a redis document
redisLib.update = function (collection, id, data, callback) {
  // Get document to update
  let hashKey = `${collection}:${id}`;
  // Lookup for the document
  redisClient.hgetall(hashKey, function (err, reply) {

    if (!err && reply) {
      // Update the provided props
      Object.entries(data).forEach(prop => {
        redisClient.hmset(hashKey, prop[0], prop[1], (err) => {
          if (err) {
            callback('Error writing existing file');
          }
        });
      });
      callback(false);
    } else {
      callback('Could not find any document, it may not exists.')
    }
  });
}

// Delete redis document
redisLib.delete = function (collection, id, callback) {
  // Get document to update
  let hashKey = `${collection}:${id}`;

  // Lookup for the document to delete
  redisClient.hgetall(hashKey, function (err, reply) {
    if (!err && reply) {
      redisClient.del(hashKey, function (err) {
        if (!err) {
          callback(false);
        } else {
          callback('Error deleting existing document')
        }
      });
    } else {
      callback('Could not find any document, it may not exists.');
    }
  });
}

// List all keys of a 'collection'
let listKeys = function (collection, callback) {

  let cursor = '0';
  let pattern = `${collection}:*`;

  // Scan Redis keys
  redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '1000', function (err, reply) {
    if (!err) {
      callback(false, reply[1]);
    } else {
      callback('Could not retrieve list, it may not exist')
    }
  });
}

redisLib.getAll = function (collection, callback) {
  let list = [];

  listKeys(collection, (err, reply) => {
    if (!err && reply.length > 0) {
      reply.forEach((doc, index) => {
        redisClient.hgetall(doc, (err, docData) => {
          if (!err && docData) {
            list.push(docData);
            if (index === reply.length - 1) {
              callback(false, list);
            }
          } else {
            callback('Database have been corrupted')
          }
        });
      });
    } else {
      callback('Internal error. Collection may not exists')
    }
  });
}

module.exports = redisLib;