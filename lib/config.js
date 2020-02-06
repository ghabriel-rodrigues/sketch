// create and export config vars


//container for all the environments
const environments = {}

//staging (default env)
environments.staging = {
  'httpPort': 3000, //should be 80
  'httpsPort': 3001,//should be 443
  'envName': 'staging',
  'hashingSecret':'thisIsASecret',
  'maxChecks': 5,
  'twilio':{
    'accountSid':'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken':'9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone':'+15995550006'
  }
}
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret':'thisIsAlsoASecret',
  'maxChecks': 5
}

//Determine which env was passed as a command line arg
const currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ?
  process.env.NODE_ENV.toLowerCase() : ''

//Check if the current env is one of the environments setted, if not, default to staging
const environmentToExport = typeof (environments[currentEnvironment]) == 'object' ?
  environments[currentEnvironment] : environments.staging

module.exports = environmentToExport














