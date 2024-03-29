/*
 * Helpers for various tasks
 *
 * 
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const path = require('path');
const fs = require('fs');

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
  if (typeof (str) == 'string' && str.length > 0) {
    let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create an string of random alphanumeric characters of a given length
helpers.createRandomString = function (strLength) {
  strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for (let i = 1; i <= strLength; i++) {
      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this caracter to the final string
      str += randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
}

// Get the string content of a template
helpers.getTemplate = function (templateName, data, callback) {
  templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : false;
  data = typeof (data) === 'object' && data !== null ? data : {};

  if (templateName) {
    let templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(templatesDir + templateName + '.html', 'utf8', function (err, str) {
      if (!err && str && str.length > 0) {
        // Do interpolation on the string
        let finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add universal _header and _footer to astring, and pass providaded data object data
helpers.addUniversalTemplates = function (str, data, callback) {
  str = typeof (str) === 'string' && str.length > 0 ? str : '';
  data = typeof (data) === 'object' && data !== null ? data : {};

  helpers.getTemplate('_header', data, function (err, headerString) {
    if (!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, function (err, footerString) {
        if (!err && footerString) {
          let fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback('Cannot find the footer template')
        }
      });
    } else {
      callback('Cannot find the header template')
    }
  });
};

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function (str, data) {
  str = typeof (str) === 'string' && str.length > 0 ? str : '';
  data = typeof (data) === 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global"
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data['global.' + keyName] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object, insert its value into th estring at the corresding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof (data[key]) == 'string') {
      let replace = data[key];
      let find = `{${key}}`;
      str = str.replace(find, replace);
    }
  }

  return str;
}

// Get the contents of static (public) asset
helpers.getStaticAsset = function (fileName, callback) {
  fileName = typeof (fileName) === 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    let publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, function (err, data) {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('Invalid file name')
  }
}

// Return pagination
helpers.paginate = function(array, page_size, page_number) {
  --page_number;
  return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

// Export the module
module.exports = helpers;