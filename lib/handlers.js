/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

//  Define the handlers
const handlers = {};

// Users handlers
handlers.users = function (data, callback) {

  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for the users submethods
handlers._users = {};

//  Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  //  Check that all required fielts are filled out
  let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, function (err, data) {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          };

          // Store the user
          _data.create('users', phone, userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { 'Error': 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { 'Error': 'Could not hashed the user\'s passwor' });
        }

      } else {
        //  User already exists
        callback(400, { 'Error': 'A user with that phone number already exists' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields' })
  }
};

//  Users - get
// Required data: phone;
//  Optional data: none;
handlers._users.get = function (data, callback) {

  //  Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
  if (phone) {

    // Get the token from the headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            // Remve the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { 'Error': 'Authentication failed' });
      }
    });

  } else {
    callback(400, { 'Error': 'Missing required field' });
  }

};

//  Users - put
// Required: phone
// Optional: firstName, lastName, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  // Check for the required field
  const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
  // Check for the optional fields
  let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {

      // Get the token from the headers
      const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', phone, function (err, userData) {
            if (!err && data) {
              // Update the necessary fields
              if (firstName) {
                userData.firstName = firstName
              }
              if (lastName) {
                userData.lastName = lastName
              }
              if (password) {
                userData.password = helpers.hash(password);
              }
              // Store the updated object
              _data.update('users', phone, userData, function (err) {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err);
                  callback(500, { 'Error': 'Could not update the user' })
                }
              });

            } else {
              callback(400, { 'Error': 'The specified user does not exist' })
            }
          });
        } else {
          callback(403, { 'Error': 'Authentication failed' });
        }
      });

    } else {
      callback(400, { 'Error': 'Missing fields to update' });
    }
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
};

//  Users - delete
// Required: phone
// TODO: Cleanup (delete) any other data files associated with this user.
handlers._users.delete = function (data, callback) {
  //  Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { 'Error': 'Could not delete the specified user' })
              }
            });
          } else {
            callback(400, { 'Error': 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { 'Error': 'Authentication failed' });
      }
    });

  } else {
    callback(400, { 'Error': 'Missing required field' });
  }
};




// Tokens handler
handlers.tokens = function (data, callback) {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for all the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required: phone, password
// Optional: none
handlers._tokens.post = function (data, callback) {

  let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  console.log(phone, password)
  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && data) {
        // Hash the sent password and compared to the password stored in the user object
        let hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // Create a new token with a random name. Set expiration date 1 hour in the future
          let tokenId = helpers.createRandomString(20);

          let expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            tokenId,
            expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { 'Error': 'Could not create the new token' })
            }
          });
        } else {
          callback(400, { 'Error': 'Incorrect Password' })
        }
      } else {
        callback(400, { 'Error': 'Could not find the specified user' })
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field(s)' });
  }
};

// Tokens - get
// Required: tokenId
// Optional: none
handlers._tokens.get = function (data, callback) {
  // Check that te id is valid
  const tokenId = typeof (data.queryStringObject.tokenId) == 'string' && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId : false;
  if (tokenId) {
    // Lookup the user
    _data.read('tokens', tokenId, function (err, tokenData) {
      if (!err && tokenData) {
        // Remve the hashed password from the user object before returning it to the requester
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field' });
  }
};

// Tokens - put
// Required: id, extend
// Optional: none
handlers._tokens.put = function (data, callback) {
  // Check for the required field
  const tokenId = typeof (data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId : false;
  const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend ? true : false;
  if (tokenId && extend) {
    // Lookup the token
    _data.read('tokens', tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token is not already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens', tokenId, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { 'Error': 'Token cannot be updated' });
            }
          });
        } else {
          callback(400, { 'Error': 'The token has already expired' })
        }
      } else {
        callback(400, { 'Error': 'Specified token does not exist' })
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field(s) or field(s) invalid' })
  }
};

// Tokens - delete Video: 10 mins
// Required: id
// Optional: None
handlers._tokens.delete = function (data, callback) {
  //  Check that the id number is valid
  const tokenId = typeof (data.queryStringObject.tokenId) == 'string' && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId : false;
  if (tokenId) {
    // Lookup the user
    _data.read('tokens', tokenId, function (err, tokenData) {
      if (!err && tokenData) {
        _data.delete('tokens', tokenId, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { 'Error': 'Could not delete the specified token' })
          }
        });
      } else {
        callback(400, { 'Error': 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field' });
  }
};

// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = function (tokenId, phone, callback) {
  // Lookup the token
  _data.read('tokens', tokenId, (err, tokenData) => {
    if (!err && tokenData) {
      //  Check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      }
    } else {
      callback(false);
    }
  });
};

// Messages handler
handlers.messages = function(data, callback) {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._messages[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all messages submethods.
handlers._messages = {};

// Messages - post
handlers._messages.post = function(data, callback) {

}

// Messages - get
handlers._messages.get = function(data, callback) {
  
}

// Messages - put
handlers._messages.put = function(data, callback) {
  
}

// Messages - delete
handlers._messages.delete = function(data, callback) {
  
}


// Ping handler
handlers.ping = function (data, callback) {
  callback(200);
};
// Not found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Export the module
module.exports = handlers;
