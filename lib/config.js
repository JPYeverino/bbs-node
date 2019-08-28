/* Create and export configuration variables
 *
 * File 3.1 -> SSL key and cert. 3.2 lib/data.js
 */

//  Container for all the environments

const environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'hashingSecret':'thisIsASecret',
  'templateGlobals': {
    'appName' : 'BBS Pro',
    'companyName' : 'NotARealCompany, Inc',
    'yearCreated' : '2019',
    'baseUrl' : 'http://localhost:3000/'
  }
};

// Production environment
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName' : 'production',
  'hashingSecret':'thisIsASecret',
  'templateGlobals': {
    'appName' : 'BBS Pro',
    'companyName' : 'NotARealCompany, Inc',
    'yearCreated' : '2019',
    'baseUrl' : 'http://localhost:5000/'
  }
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLocaleLowerCase() : '';

// Chek that the current environment is one of the environments above, if not, default to string

let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;