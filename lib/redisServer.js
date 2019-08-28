/*
 * Redis-related tasks
 */

//  Dependencies
const util = require('util');
const redis = require('redis');
// Redis Client intitialization
const redisClient = redis.createClient();

// Export Redis client
module.exports = redisClient;