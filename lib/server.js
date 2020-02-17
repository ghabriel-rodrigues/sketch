//server related tasks  

const fs = require('fs')
const http = require('http')
const https = require('https')
const url = require('url')
const path = require('path')

const StringDecoder = require('string_decoder').StringDecoder
const config = require('./config')
const _data = require('./data')
const handlers = require('./handlers')
const helpers = require('./helpers')

const util = require('util')
const debug = util.debuglog('server')


// //@TODO GET RID OF THIS
// helpers.sendTwilioSMS('4158375309','Hello!', function(err){
//   debug('this was the error', err)
// })

// //TESTING
// // @TODO DELETE THIS
// _data.update('test','newFile',{'oi 2 ':'hey you 2'},function(err){
//   debug('this was the error', err)
// })

//instantiate the server module object
let server = {}


server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res)
});



server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pe'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
  server.unifiedServer(req, res)
});





//all the server logic for both http and https servers
server.unifiedServer = function (req, res) {
  //get the url and parse it
  const parsedUrl = url.parse(req.url, true)

  //get the path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  //get the querystring
  const queryStringObject = parsedUrl.query

  //get the http methd
  const httpMethod = req.method.toLowerCase()

  //get the headers
  const headers = req.headers

  //get the payload
  const decoder = new StringDecoder('utf-8')
  let buffer = ''
  req.on('data', function (data) {
    buffer += decoder.write(data)
  })
  req.on('end', function () {
    buffer += decoder.end()

    //choose the handler this request should go to. If one is not
    const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ?
      server.router[trimmedPath] : handlers.notFound

    //construct the data object to send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': httpMethod,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    }

    chosenHandler(data, function (statusCode, payload) {
      // use the status code called back by the handler or default 
      statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

      // Use the payload called back by the handler or default to the empty object
      payload = typeof (payload) == 'object' ? payload : {}

      //Convert the payload to a string
      const payloadString = JSON.stringify(payload)

      //Return the response
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end('Payload', payloadString)

      //if the response is 200, print green otherwise print red
      //log the request path

      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode)
      } else {
        debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode)
      }

      debug('Request received on path ' + trimmedPath + ' with this method' + httpMethod)
      debug('Query strings: ', queryStringObject)
      debug('Headers: ', headers)
      debug('Payload: ', payloadString)
      debug('statusCode: ', statusCode)

    })


  })
}

//defining a request router
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
}

// init script
server.init = function () {
  //start the http server
  server.httpServer.listen(config.httpPort, function () {
    console.log('\x1b[36m%s\x1b[0m', "The server is listenings on port " + config.httpPort + " in " + config.envName + " now")

  });

  //start https server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log('\x1b[35m%s\x1b[0m', "The server is listenings on port " + config.httpsPort + " in " + config.envName + " now")

  });

}

module.exports = server