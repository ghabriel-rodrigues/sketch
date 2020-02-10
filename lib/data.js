/* library for storing and editing data */

//dependencies
const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

//Container for the module (to be exported)
const lib = {}

// base directory of data folder
lib.baseDir = path.join(__dirname, '/../.data/')

//write a data to a file
lib.create = function (dir, file, data, callback) {
  //open the file for writing
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      //Convert data to string
      let stringData = JSON.stringify(data);

      //Write to file and close it
      fs.writeFile(fileDescriptor, stringData, function (err) {
        if (!err) {
          fs.close(fileDescriptor, function (err) {
            if (!err) {
              callback(false)
            } else {
              callback('Error closing new file')
            }
          })
        } else {
          callback('Error writing to new file')
        }
      })
    } else {
      callback('Could not create new file, it may already exists')
    }
  })
}

//Read data from a file
lib.read = function (dir, file, callback) {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function (err, data) {
    if (!err && data) {
      let parsedData = helpers.parseJsonToObject(data)
      callback(false, parsedData)
    } else {
      callback(err, data)
    }
  })
}

//update data inside a file
lib.update = function (dir, file, data, callback) {
  //open the file for reading
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      let stringData = JSON.stringify(data)
      //Truncate the file
      fs.ftruncate(fileDescriptor, function (err) {
        if (!err) {
          //write to the file and close it
          fs.writeFile(fileDescriptor, stringData, function (err) {
            if (!err) {
              fs.close(fileDescriptor, function (err) {
                if (!err) {
                  callback(false)
                } else {
                  callback('error closing the existing file')
                }
              })
            } else {
              callback('error writing to existing file')
            }
          })
        } else {
          callback('Error truncating file')
        }
      })
    } else {
      callback('Could not open the file for updating, it may not exist yet')
    }
  })
}

lib.delete = function (dir, file, callback) {
  //unlink the file
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
    if (!err) {
      callback(false)
    } else {
      callback('Error deleting file')
    }
  })
}

//list all the item in a directory
lib.list = function (dir, callback) {
  fs.readdir(lib.baseDir + dir + '/', function (err, data) {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = []
      data.forEach(function(fileName){
        trimmedFileNames.push(fileName.replace('.json',''))
      })
      callback(false, trimmedFileNames) 
    } else {
      callback(err, data)
    }
  })
}








module.exports = lib