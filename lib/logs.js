//A lib for storing and rotating logs

//dependencies
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

//container for the module
const lib = {}

// base directory of logs folder
lib.baseDir = path.join(__dirname, '/../.logs/')

//append a string to a file, create the file if it does not exist
lib.append = function(file,str,callback){
  //open the file for appending
  fs.open(lib.baseDir+file+'.log','a',function(err, fileDescriptor){
    if(!err && fileDescriptor){
      //append to the file and close it
      fs.appendFile(fileDescriptor, str+'\n', function(err){
        if(!err){
          fs.close(fileDescriptor, function(err){
            if(!err){
              callback(false)
            } else {
              callback('Error closing file that was being appended')
            }
          })
        } else {
          callback('Error appending to file')
        }
      })


    } else{
      callback('Could nto open the file for appending')
    }
  })
}

//list all the logs and optionally include the compressed logs
lib.list = function(includeCompressLogs, callback){
  fs.readdir(lib.baseDir, function(err, data){
    if(!err && data && data.length >0){
      let trimmedFileNames = []
      data.forEach(function(fileName){
        //add the .log files
        if(fileName.indexOf('.log')> -1){
          trimmedFileNames.push(fileName.replace('.log',''))
        }

        //add on the .gz files to the array
        if(fileName.indexOf('.gz.b64')>-1 && includeCompressLogs){
          trimmedFileNames.push(fileName.replace('.gz.b64'),'')
        } 
      })
      callback(false, trimmedFileNames)
    } else{
      callback(err, data)
    }
  })
}

//compress the contents of one.log file into a .gz.b64files within the same directory
lib.compress = function(logId, newFileId, callback){
  let sourceFile = logId+'.log'
  let destFile = newFileId+'.gz.b64'

  //read the source file
  fs.readFile(lib.baseDir+sourceFile,'utf8',function(err,inputString){
    //compress the data using gzip
    if(!err && inputString){
      zlib.gzip(inputString, function(err, buffer){
        if(!err && buffer){
          fs.open(lib.baseDir+destFile, 'wx', function(err, fileDescriptor){
            if(!err){
              //write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64', function(err){
                if(!err){
                  //close the destinatin file
                  fs.close(fileDescriptor, function(err){
                    if(!err){
                      callback(false)
                    } else {
                      callback(err)
                    }
                  })
                } else {
                  callback(err)
                }
              }))
            } else {
              callback(err)
            }
          })
        } else {
          callback(err)
        }
      })
    } else {
      callback(err)
    }
  
  })
}

//decompress the contents of a .gz.b64 file into a string var
lib.decompress = function(fileId, callback){
  let fileName = fileId+'.gz.b64'
  fs.readFile(lib.baseDir+fileName,'utf8', function(err, str){
    if(!err && str){
      //decompress the data
      let inputBuffer = Buffer.from(str, 'base64')
      zlib.unzip(inputBuffer, function(err, outputBuffer){
        if(!err && outputBuffer){
          //callback
          let str = outputBuffer.toString()
          callback(false, str)
        } else{
          callback(err)
        }
      })
    } else{
      callback(err)
    }
  })
}

//truncating a log file
lib.truncate = function(logId, callback){
  fs.truncate(lib.baseDir+logId+'.log', 0, function(err){
    if(!err){
      callback(false)
    } else {
      callback(err)
    }
  })
}


module.exports = lib
