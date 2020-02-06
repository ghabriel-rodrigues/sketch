const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./lib/config')
const fs = require('fs')
const _data = require('./lib/data')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

// //@TODO GET RID OF THIS
// helpers.sendTwilioSMS('4158375309','Hello!', function(err){
//   console.log('this was the error', err)
// })

// //TESTING
// // @TODO DELETE THIS
// _data.update('test','newFile',{'oi 2 ':'hey you 2'},function(err){
//   console.log('this was the error', err)
// })


const httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res)
});

httpServer.listen(config.httpPort, function () {
  console.log("The server is listenings on port "+config.httpPort+" in "+config.envName+" now")
});

const httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pe')
}
const httpsServer = https.createServer(httpsServerOptions,function (req, res) {
  unifiedServer(req, res)
});

httpsServer.listen(config.httpsPort, function () {
  console.log("The server is listenings on port "+config.httpsPort+" in "+config.envName+" now")
});



//all the server logic for both http and https servers
const unifiedServer = function(req,res){
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
    const chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ?
      router[trimmedPath] : handlers.notFound

    //construct the data object to send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': httpMethod,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    }

    chosenHandler(data, function(statusCode, payload){
      // use the status code called back by the handler or default 
      statusCode = typeof(statusCode) == 'number' ? statusCode :200;

      // Use the payload called back by the handler or default to the empty object
      payload = typeof(payload) == 'object' ? payload:{}
    
      //Convert the payload to a string
      const payloadString = JSON.stringify(payload)

      //Return the response
      res.setHeader('Content-Type','application/json')
      res.writeHead(statusCode)
      res.end('Payload', payloadString)

      //log the request path
      console.log('Request received on path ' + trimmedPath + ' with this method' + httpMethod)
      console.log('Query strings: ', queryStringObject)
      console.log('Headers: ', headers)
      console.log('Payload: ', payloadString)
      console.log('statusCode: ', statusCode)
    
    })

    
  })
}

//defining a request router
const router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks' : handlers.checks
}