//Worker related tasks


//dependencies
const path = require('path')
const fs = require('fs')
const _data = require('./data')
const https = require('https')
const http = require('http')
const helpers = require('./helpers')
const url = require('url')


//instatiate the worker objetc

const workers = {}

//lookup all the checks get their data and send to a validator
workers.gatherAllChecks = function () {
  //get all the checks
  _data.list('checks', function (err, checks) {
    if (!err && checks && checks.length > 0) {
      checks.forEach(function (check) {
        //read in the check data
        _data.read('checks', check, function (err, originalCheckData) {
          if (!err && originalCheckData) {
            //pass it to the check validator and let that cfunction continue
            workers.validateCheckData(originalCheckData)
          } else {
            console.log('error reading one of the checks data')
          }
        })
      })
    } else {
      console.log('error GATHERING ALL THE CHECKS -> COULD NOT FIND ANY CHECKS TO PROCESS')
    }
  })
}

//Sanity checking the check-data
workers.validateCheckData = function (originalCheckData) {
  originalCheckData = typeof (originalCheckData) == 'object' &&
  originalCheckData != null ? originalCheckData : {}

  originalCheckData.id = typeof (originalCheckData.id) == 'string' &&
    originalCheckData.id.trim().length == 20 ?
    originalCheckData.id.trim() : false

  originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' &&
    originalCheckData.userPhone.trim().length == 10 ?
    originalCheckData.userPhone.trim() : false

  originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' &&
    ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ?
    originalCheckData.protocol : false

  originalCheckData.url = typeof (originalCheckData.url) == 'string' &&
    originalCheckData.url.trim().length > 0 ?
    originalCheckData.url.trim() : false

  originalCheckData.method = typeof (originalCheckData.method) == 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ?
    originalCheckData.method : false

  originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' &&
    originalCheckData.successCodes > 0 && originalCheckData.successCodes instanceof Array ?
    originalCheckData.successCodes : false

  originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' &&
    originalCheckData.timeoutSeconds % 1 === 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5 ?
    originalCheckData.timeoutSeconds : false

  //set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state = typeof (originalCheckData.state) == 'string' &&
    ['up', 'down'].indexOf(originalCheckData.state) > -1 ?
    originalCheckData.state : 'down'

  originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' &&
    originalCheckData.lastChecked > 0 ?
    originalCheckData.lastChecked : false

  //if all the checks pass, pass the data along to the next step in the process
  if (originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData)
  } else {
    console.log('Error: One of the checks is not properly formatted. Skipping it.')
  }
}

//perform the check data sending the originalcheckdata and the output to the next part of the process
workers.performCheck = function (originalCheckData) {
  //prepare the initial check outcome
  let checkOutcome = {
    'error': false,
    'responseCode': false
  }

  //mark that outcome has not been sent yet
  let outcomeSent = false

  //parse the hostname and the path out of the original checkdata
  let parsedUrl = url.parse(originalCheckData.protocol + '://' +
    originalCheckData.url, true)

  let hostName = parsedUrl.hostname;
  let path = parsedUrl.path; //Using path and not 'pathname' because we want to access the querystring

  //constructing the request
  let requestDetails = {
    'protocol': originalCheckData.protocol + ':',
    'hostname': hostName,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckData.timeoutSeconds * 1000
  }

  //instantiate the request object (using either the http or https module)
  let _moduleToUse = originalCheckData.protocol == 'http' ? http : https
  let req = _moduleToUse.request(requestDetails, function (res) {
    //grab the status of the sent request
    let status = res.statusCode

    //update the checkoutcome and pass the data along
    checkOutcome.responseCode = status
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  //Bind to the error event so it doesnt get thrown
  req.on('error', function (e) {
    //update the checkoutcome and pass the data along
    checkOutcome.error = { 'error': true, 'value': e }
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  //Bind to the error event so it doesnt get thrown
  req.on('timeout', function (e) {
    //update the checkoutcome and pass the data along
    checkOutcome.error = { 'error': true, 'value': 'timeout' }

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  //end the request
  req.end()
}

//Process the checkoutcome, update the checkdata as needed and trigger and alert if needed
//special logic for accomodating a check that has never been tested before(dont alert on to that one)
//only advert when status has changed
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  //Decide if the check is considered up or down
  let state = !checkOutcome.error && checkOutcome
    .responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode > -1) ?
    'up' : 'down'

  //decide if an alert is warranted
  let alertWarranted = originalCheckData.lastChecked &&
    originalCheckData.state !== state ? true : false

  //update the check data
  let newCheckData = originalCheckData
  newCheckData.state = state
  newCheckData.lastChecked = Date.now()

  _data.update('checks', newCheckData.id, newCheckData, function (err) {
    if (!err) {
      //send the new check data to the next phase of the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChanged()
      } else {
        console.log('Checkoutcome has not changed so no alert was needed')
      }
    } else {
      console.log('Error trying to save updates to one of the checks')
    }
  })
}

//ALert the user as to a change in ther check status
workers.alertUserToStatusChanged = function (newCheckData) {
  let msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' +
    newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state

  helpers.sendTwilioSMS(newCheckData.userPhone, msg, function (err) {
    if (!err) {
      console.log('Success: User was alert to a status change via SMS')
    } else {
      console.log('Error: Could not send a sms alert to the user who had a state change in their check')
    }
  })
}


//Timer to execute the worker process once per minute
workers.loop = function () {
  setInterval(function () {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

//Init script
workers.init = function () {
  //execute all the checks as soon as it starts up
  workers.gatherAllChecks()
  //call the loop so the checks will execute later on
  workers.loop()
}


module.exports = workers