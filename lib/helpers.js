//helpers for various tasks

//dependencies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')

//Container for all the helpers
const helpers = {}

//create a sha256 hash
helpers.hash = function (str) {
  if (typeof (str) == 'string' && str.length > 0) {
    let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
  } else {
    return false
  }
}

//parse a json string to an object and all cases without throwing
helpers.parseJsonToObject = function (str) {
  try {
    var obj = JSON.parse(str)
    return obj
  } catch (e) {
    return {}
  }
}

//create a string random alpha numeric of a given length
helpers.createRandomString = function (strLength) {
  strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false
  if (strLength) {
    //define all the possible chars that could go into a string
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let str = ''

    for (let i = 1; i < strLength; i++) {
      // get a random char from the possiblechars string 
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
      str += randomCharacter
    }

    return str

  } else {
    return false
  }
}

//send an sms message via twilio
helpers.sendTwilioSMS = function (phone, msg, callback) {
  //validate parameters
  phone = typeof (phone) == 'string' &&
    phone.trim().length == 10 ?
    phone.trim() : false
  msg = typeof (msg) == 'string' &&
    msg.trim().length <= 1600 ?
    msg.trim() : false


  if (phone && msg) {
    console.log(config)

    //config the request payload
    let payload = {
      'From': config.twilio.fromPhone,
      'To': '+1' + phone,
      'Body': msg
    }

    //stringfy the payload
    let stringPayload = querystring.stringify(payload)

    //configure the request details to TWILIO
    let requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    }

    //instantiate the request object
    let req = https.request(requestDetails, function (res) {
      //grab the status of the sent request
      let status = res.statusCode
      //callback successfully if the request went through
      if (status == 200 || status == 201) {
        callback(false)
      } else {
        callback('Status code returned was ' + status)
      }
    })


    //bind to the error event so it doesnt get thrown
    req.on('error', function (event) {
      callback(event)
    })

    //add the payload to the request
    req.write(stringPayload)

    //end the request
    req.end()

  } else {
    callback('Given parameters were missing or invalid')
  }

}












module.exports = helpers