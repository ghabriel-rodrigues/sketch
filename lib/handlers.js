//request handlers

//dependencies
const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

//define handlers
const handlers = {}


//1) USER SESSION
handlers.users = function (data, callback) {
  let acceptableMethods = ['post', 'get', 'put', 'delete']
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
}


//container for the users submethods
//required data firstname, lastname, phone, password, tosagreement
handlers._users = {}

handlers._users.post = function (data, callback) {
  //check if that all required fields are filled out
  let firstname = typeof (data.payload.firstname) == 'string' &&
    data.payload.firstname.trim().length > 0 ?
    data.payload.firstname.trim() : false

  let lastname = typeof (data.payload.lastname) == 'string' &&
    data.payload.lastname.trim().length > 0 ?
    data.payload.lastname.trim() : false

  let phone = typeof (data.payload.phone) == 'string' &&
    data.payload.phone.trim().length == 10 ?
    data.payload.phone.trim() : false

  let password = typeof (data.payload.password) == 'string' &&
    data.payload.password.trim().length > 0 ?
    data.payload.password.trim() : false

  let tosagreement = typeof (data.payload.tosagreement) == 'boolean' &&
    data.payload.tosagreement == true ?
    true : false

  if (firstname && lastname && phone && password && tosagreement) {
    //Make sure that the user doesnt already exist
    _data.read('users', phone, function (err, data) {
      if (err) {
        //hash the password
        let hashpassword = helpers.hash(password)

        if (hashpassword) {
          let userObject = {
            'firstName': firstname,
            'lastName': lastname,
            'phone': phone,
            'hashedPassword': hashpassword,
            'tosAgreement': true
          }

          _data.create('users', phone, userObject, function (err) {
            if (!err) {
              callback(200)
            } else {
              console.log(err)
              callback(500, { 'Error': 'Could not hash the user\'s password' })
            }
          })
        } else {
          callback(500, { 'Error': 'Could not hash the users password' })
        }
      } else {
        //user already exists
        callback(400, { 'Error': 'A user with that phone number already exists' })
      }
    })

  } else {
    callback(400, { 'Error': 'Missing required fields' })
  }
}

//Users - get
//required data:phone
//optional data: none
handlers._users.get = function (data, callback) {
  //check that the phone number is valid
  let phone = typeof (data.queryStringObject.phone) == 'string' &&
    data.queryStringObject.phone.trim().length == 10 ?
    data.queryStringObject.phone.trim() : false

  if (phone) {
    //get the token from the headers
    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

    //verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        //lookp the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            //remote the hash passed fro the user bject before returning it to requestor
            delete data.hashedPassword
          } else {
            callback(404)
          }
        })
      } else {
        callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

//Users - puy
//required data: phone
//optional data: firstname, lastname, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  //check for the required field
  let phone = typeof (data.payload.phone) == 'string' &&
    data.payload.phone.trim().length == 10 ?
    data.payload.phone.trim() : false

  //check for the optional fields
  //check if that all required fields are filled out
  let firstname = typeof (data.payload.firstname) == 'string' &&
    data.payload.firstname.trim().length > 0 ?
    data.payload.firstname.trim() : false

  let lastname = typeof (data.payload.lastname) == 'string' &&
    data.payload.lastname.trim().length > 0 ?
    data.payload.lastname.trim() : false

  let password = typeof (data.payload.password) == 'string' &&
    data.payload.password.trim().length > 0 ?
    data.payload.password.trim() : false

  //error if the phone is invalid
  if (phone) {
    //error if nothing is sent to updaet
    if (firstname || lastname || password) {

      //get the token from the headers
      let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

      //verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          //lookup the user
          _data.read(users, phone, function (err, userData) {
            if (!err && userData) {
              //Update the fields necessary
              if (firstname) {
                userData.firstName = firstname
              }
              if (lastname) {
                userData.lastName = lastname
              }
              if (password) {
                userData.hashedpassword = helpers.hash(password)
              }
              //store the new updates
              _data.update('users', phone, userData, function (err) {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err)
                  callback(500, { 'error': 'could not update the user' })
                }
              })
            } else {
              callback(400, { 'Error': 'The specified user does not exist' })
            }
          })
        } else {
          callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
        }
      })


    } else {
      callback(400, { 'error': 'missing field to update' })
    }
  } else {
    callback(400, { 'error': 'Missing required field' })
  }

}

//Users- delete
//required field: phne
handlers._users.delete = function (data, callback) {
  //check if the phne number is valid
  //check that the phone number is valid
  let phone = typeof (data.queryStringObject.phone) == 'string' &&
    data.queryStringObject.phone.trim().length == 10 ?
    data.queryStringObject.phone.trim() : false

  if (phone) {
    //get the token from the headers
    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

    //verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        //lookup the user
        _data.read('users', phone, function (err, userData) {
          if (!err && userData) {
            //remote the hash passed fro the user bject before returning it to requestor
            _data.delete('users', phone, function (err) {
              if (!err) {

                //if the user was deleted succssfully, delete each of the checks associated with the user
                let userChecks = typeof (userData.checks) == 'object' &&
                  userData.checks instanceof Array ? userData.checks : []
                let checksToDelete = userChecks.length
                if (checksToDelete > 0) {
                  let checksDeleted = 0
                  let deletionErrors = false

                  //look through the checks
                  userChecks.forEach(function (checkId) {
                    //delete the check
                    _data.delete('checks', checkId, function (err) {
                      if (!err) {
                        deletionErrors = true
                      }
                      checksDeleted++
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200)
                        } else {
                          callback(500, { 'Error': 'Errors encountered hwile attempting to delete all of the users checks. All checks may not have been deleted from the system successfully' })
                        }
                      }
                    })
                  })

                } else {
                  callback(200, { 'OK': 'No data to be deleted' })
                }


              } else {
                callback(500, { 'Error': 'Could not delete the specified user' })
              }
            })
          } else {
            callback(400, { 'Error': 'COuld not find the specified users' })
          }
        })
      } else {
        callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}
//END OF USER SESSION ------------------------------------

//2) TOKEN SESSIONS ------------------------------------------
//tokens
handlers.tokens = function (data, callback) {
  let acceptableMethods = ['post', 'get', 'put', 'delete']
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
}

//container for all tokens methods
handlers._tokens = {}

//required data:phone password
//optional: none
handlers._tokens.post = function (data, callback) {
  let phone = typeof (data.payload.phone) == 'string' &&
    data.payload.phone.trim().length == 10 ?
    data.payload.phone.trim() : false

  let password = typeof (data.payload.password) == 'string' &&
    data.payload.password.trim().length > 0 ?
    data.payload.password.trim() : false

  if (phone && password) {
    _data.read('users', phone, function (err, userData) {
      if (!err && userData) {
        //hash the sent password and comparate it to the password stored into the user obj
        let hashedPassword = helpers.hash(password)
        if (hashedPassword == userData.hashedPassword) {
          //if valid, create a new token with a random name. Set expiration date one hour in the future
          let tokenId = helpers.createRandomString(20)
          let expires = Date.now() + 1000 * 60 * 60
          let tokenObject = {
            'id': tokenId,
            'phone': phone,
            'expires': expires
          }
          //store the token
          _data.create('tokens', tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject)
            } else {
              callback(500, { 'Error': 'Could not create the new token' })
            }
          })
        } else {
          callback(400, { 'Error': 'Password did not match the specified user\'s stored password' })
        }
      }
      else {
        callback(400, { 'Error': 'Could not find the specified user' })
      }
    })



  } else {
    callback(400, { 'Error': 'Missing required fields' })
  }
}


//tokens get
//required data: id
//optional data: none
handlers._tokens.get = function (data, callback) {
  //check that the id is valid
  let id = typeof (data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false

  if (id) {
    //lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        //remote the hash passed fro the user bject before returning it to requestor
        callback(200, tokenData)
      } else {
        callback(404)
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

//Tokens - put
// required data: id, extend
//optional data: none
handlers._tokens.put = function (data, callback) {
  let id = typeof (data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false

  let extend = typeof (data.queryStringObject.extend) == 'boolean' &&
    data.payload.extend == true ?
    true : false

  if (id && extend) {
    //lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        //check to the make sure the token isnt already expired
        if (tokenData.expires > Date.now()) {
          //set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60

          //store the new updates
          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              callback(200)
            } else {
              callback(500, { 'Error': 'Could not update the tokens expiration' })
            }
          })
        } else {
          callback(400, { 'Error': 'The token has already experied and cannot be extended' })
        }
      } else {
        callback(400, { 'Error': 'Specified token does not exist' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required fields or field are invalid' })
  }

}

//tokens delete
//required data: id
//optional: none
handlers._tokens.delete = function (data, callback) {
  //check if the phne number is valid
  //check that the phone number is valid
  let id = typeof (data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false

  if (id) {
    _data.read('tokens', id, function (err, data) {
      if (!err && data) {
        //remote the hash passed fro the user bject before returning it to requestor
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200)
          } else {
            callback(500, { 'Error': 'Could not delete the specified token' })
          }
        })
      } else {
        callback(400, { 'Error': 'Could not find the specified tokens' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

//verify if a given token id is currently valid for a specify user
handlers._tokens.verifyToken = function (id, phone, callback) {
  //loopup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      //check if the token is fot the gien user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true)
      } else {
        callback(false)
      }
    } else {
      callback(false)
    }
  })
}

//END OF TOKEN SESSION -------------------------------------

//3) CHECKS SESSION -------------------------------------------
//checks
handlers.checks = function (data, callback) {
  let acceptableMethods = ['post', 'get', 'put', 'delete']
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405)
  }
}

//container for all checks methods
handlers._checks = {}

//checks - post
//required data: protocol(http or https),url, method, successCodes (200, 404 or etc), timeoutSeconds
//optionaldata: none
handlers._checks.post = function (data, callback) {
  //validate all the inputs
  let protocol = typeof (data.payload.protocol) == 'string' &&
    ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
    data.payload.protocol : false
  let url = typeof (data.payload.url) == 'string' &&
    data.payload.url.trim().length > 0 ?
    data.payload.url : false
  let method = typeof (data.payload.method) == 'string' &&
    ['pst', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
    data.payload.method : false
  let successCodes = typeof (data.payload.successCodes) == 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0 ?
    data.payload.successCodes : false
  let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5 ?
    data.payload.timeoutSeconds : false

  // console.log(data)
  // console.log('protocol', protocol)
  // console.log('url',url)
  // console.log('method',method)
  // console.log('successCodes',successCodes)
  // console.log('timeoutSeconds',timeoutSeconds)


  if (protocol && url && method && successCodes && timeoutSeconds) {
    //get the token from the headers
    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

    //lookup the user by reading the token
    _data.read('tokens', token, function (err, tokenData) {
      if (!err && tokenData) {
        let userPhone = tokenData.phone

        //Lookup the user data
        _data.read('users', userPhone, function (err, userData) {
          if (!err && userData) {
            let userChecks = typeof (userData.checks) == 'object' &&
              userData.checks instanceof Array ? userData.checks : []
            //check if the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              //create a random id for the check
              let checkId = helpers.createRandomString(20);
              //create the check object and incluse the user's phone
              let checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              }

              //save the object
              _data.create('checks', checkId, checkObject, function (err) {
                if (!err) {
                  // add the check id to the users object
                  userData.checks = userChecks
                  userData.checks.push(checkId)

                  //Save the new user data
                  _data.update('users', userPhone, userData, function (err) {
                    if (!err) {
                      //return to the requester the data about the new check
                      callback(200, checkObject)

                    } else {
                      callback(500, { 'Error': 'COuld not update the user with the new check' })
                    }
                  })

                } else {
                  callback(500, { 'Error': 'COuld not create the new check' })
                }
              })
            } else {
              callback(400, { 'error': 'the user already has the max number of checks (' + config.maxChecks + ')' })
            }
          } else {
            callback(403)
          }
        })
      } else {
        callback(403)
      }
    })
  } else {
    callback(400, { "Error": 'Missing required inputs or inputs are invalid, in a bad format' })
  }
}

//checks - get
//required data: id
//optional: none
handlers._checks.get = function (data, callback) {
  //check that the id is valid
  let id = typeof (data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.length == 20 ?
    data.queryStringObject.id : false

  if (id) {
    //lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {


        //get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

        //verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {
            //return the check data
            callback(200, checkData)
          } else {
            callback(403)
          }
        })


      } else {
        callback(404)
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}


//checks - put
//required: id
//optional: protocol, url, method, successCodes, timeoutSeconds
//at least one of the optional must be sent
handlers._checks.put = function (data, callback) {
  //check for the required field
  let id = typeof (data.payload.id) == 'string' &&
    data.payload.id.length == 20 ?
    data.payload.id : false

  //check for the optional fields
  //check if that all required fields are filled out
  //validate all the inputs
  let protocol = typeof (data.payload.protocol) == 'string' &&
    ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
    data.payload.protocol : false
  let url = typeof (data.payload.url) == 'string' &&
    data.payload.url.trim().length > 0 ?
    data.payload.url : false
  let method = typeof (data.payload.method) == 'string' &&
    ['pst', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
    data.payload.method : false
  let successCodes = typeof (data.payload.successCodes) == 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0 ?
    data.payload.successCodes : false
  let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5 ?
    data.payload.timeoutSeconds : false

  //check to make sure id is valid
  if (id) {
    //check to make sure one or more optional fields has been sent
    if (protocol ||
      url ||
      method ||
      successCodes ||
      timeoutSeconds) {
      //lookup the check
      _data.read('checks', id, function (err, checkData) {
        if (!err && checkData) {

          //get the token from the headers
          let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

          //verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
            if (tokenIsValid) {
              //update the check where it is necessary
              if (protocol) {
                checkData.protocol = protocol
              }
              if (url) {
                checkData.url = url
              }
              if (method) {
                checkData.method = method
              }
              if (successCodes) {
                checkData.successCodes = successCodes
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds
              }


              //if everything is ok, store the new updates
              _data.update('checks', id, checkData, function (err) {
                if (!err) {
                  callback(200)
                } else {
                  callback(500, { 'Error': 'Could not update the check' })
                }
              })

            } else {
              callback(403)
            }
          })


        } else {
          callback(400, { 'Error': 'checkid does not exist' })
        }
      })
    } else {
      callback(400, { 'error': 'missing fields to update' })
    }
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }

}

//checks - delete
//required: id
//optional: none
//@todo only let delete his own obj
//@TODO cleanup any other data files associated with user
handlers._checks.delete = function (data, callback) {
  //check if the phne number is valid
  //check that the id is valid
  let id = typeof (data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false

  if (id) {


    //lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err) {

        //get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

        //verify that the given token is valid for the id number
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {

            // delete the check data
            _data.delete('checks', id, (function (err) {
              if (!err) {
                //lookup the user
                _data.read('users', checkData.userPhone, function (err, userData) {
                  if (!err && userData) {

                    let userChecks = typeof (userData.checks) == 'object' &&
                      userData.checks instanceof Array ? userData.checks : []

                    //Remove the delete check from their list of checks
                    let checkPosition = userChecks.indexOf(id)
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1)

                      //re-save user's data
                      _data.update('users', checkData.userPhone, userData, function (err) {
                        if (!err) {
                          callback(200)
                        } else {
                          callback(500, { 'Error': 'Could not update the user' })
                        }
                      })
                    } else {
                      callback(500, { 'Error': 'Could not find the check on the user object, so could not remove it' })
                    }
                  } else {
                    callback(500, { 'Error': 'Could not delete the specified user' })
                  }
                })
              } else {
                callback(500, { 'Error': 'Could not delete the check data' })
              }
            }))
          } else {
            callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
          }
        })


      } else {
        callback(400, { 'Error': 'Specified check ID does not exist' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}



//END OF CHECKS SESSION


handlers.ping = function (data, callback) {
  //callback http status code and a payload object
  callback(200, { 'name: ': 'sample handler' })
}
handlers.notFound = function (data, callback) {
  callback(404)
}

module.exports = handlers