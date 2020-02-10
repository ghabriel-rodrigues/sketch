//dependencies

const server = require('./lib/server')
const workers = require('./lib/workers')

//declare the app
let app = {}

//init function
app.init = function(){
  //start the server and the workers
  server.init()
  workers.init()
}

app.init()

module.exports = app