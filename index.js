'use strict';

// Import modules
var gutil = require('gulp-util');
var through = require('through2');
var csv = require('pac-csv-array');
var mkdirp = require('mkdirp');
var fs  = require('fs');
var https = require('https');

// Consts
var PLUGIN_NAME = 'gulp-pac-csv2json';

// Exports
module.exports = function (options) {
  options.filePath    = options.filePath + "&_timestamp=" + (new Date()).getTime() || '';
  options.dest        = options.dest || '';
  options.output      = options.output || 'result.json';
  options.delColumn   = options.delColumn || [];
  options.addColumn   = options.addColumn || [];
  options.delRow      = options.delRow || [];
  options.callback    = options.callback || function() {};
  options.debug       = options.debug || false;

  return through.obj(function (file, enc, cb) {

    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return cb();
    }

    // Make dest dir
    mkdirp(options.dest, function(err) {
      if (err) return console.log(err);
    });

    // Fetch remote csv file
    options.fileName = __dirname + '/tmp.csv';
    var csvFile = fs.createWriteStream(options.fileName);
    var request = https.get(options.filePath, function(response) {
      response.pipe(csvFile);

      csvFile.on('finish', function() {
        csvFile.close(cb_success);
      });
    }).on('error', function(err) {
      fs.unlink(options.fileName);
      if (cb_error) cb_error(err.message);
    });

    // Callback success
    function cb_success() {
      csv.parseCSV(options.fileName, function(data) {
        if (options.debug === 1) {
          console.log('====================data====================');
          console.log(JSON.stringify(data, null, 2));
        };

        var tmpData = [];

        loop1:
        for (var i = data.length - 1; i >= 0; i--) {
          var item = data[i];

          // filter rows with options.delRow.test
          loop2:
          for (var n = options.delRow.length - 1; n >= 0; n--) {
            var condition = options.delRow[n];
            var patt = new RegExp(condition.test);

            if (patt.test(item[condition.key])) {
              data.splice(i, 1);
              break loop1;
            };
          };

          // delete columns in options.delColumn
          for (var n = options.delColumn.length - 1; n >= 0; n--) {
            delete data[i][options.delColumn[n]];
          };

          // add columns in options.addColumn
          for (var n = options.addColumn.length - 1; n >= 0; n--) {
            var column = options.addColumn[n];
            var value = column.func(data[i][column.param[0]]);
            data[i][column.name] = value;
          };

          // beautify keys
          var tmpRow = {};
          for (var j in data[i]) {
            var k = j.toLowerCase().replace(/ /g, '_');

            tmpRow[k] = data[i][j];
          };

          tmpData.push(tmpRow);
        };

        if (options.debug === 2) {
          console.log('====================tmpData====================');
          console.log(JSON.stringify(tmpData, null, 2));
        };

        (function(tmpData) {
          fs.writeFile(options.dest + options.output, JSON.stringify(tmpData, null, 2), function(err) {
            if (err) return console.log(err);
            console.info(logTime() + ' File generated! > \'' + logText('./' + options.dest + options.output, 'cyan') + '\'');
            cb_saved();
          });
        })(tmpData);
      });
    }

    // Callback error
    function cb_error(err) {
      console.log(err);
    }

    var countFiles = 1;
    var countSavedFiles = 0;

    function cb_saved() {
      if (++countSavedFiles == countFiles) {
        options.callback();
      };
    }

    // Helper
    function escape_quot(str, doubleSlashes) {
      doubleSlashes = doubleSlashes | false;

      if (doubleSlashes) {
        return str.replace(/&quot;/g, '\\"');
      } else {
        return str.replace(/&quot;/g, '\"');
      };
    }

    var styles = {
      'white'     : ['\x1B[37m', '\x1B[39m'],
      'grey'      : ['\x1B[90m', '\x1B[39m'],
      'black'     : ['\x1B[30m', '\x1B[39m'],
      'blue'      : ['\x1B[34m', '\x1B[39m'],
      'cyan'      : ['\x1B[36m', '\x1B[39m'],
      'green'     : ['\x1B[32m', '\x1B[39m'],
      'magenta'   : ['\x1B[35m', '\x1B[39m'],
      'red'       : ['\x1B[31m', '\x1B[39m'],
      'yellow'    : ['\x1B[33m', '\x1B[39m']
    };

    function logText(str, style) {
      return styles[style][0] + str + styles[style][1];
    }

    function logTime(str) {
      var tzoffset = (new Date()).getTimezoneOffset() * 60000;
      var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(11,-5);

      return '[' + logText(localISOTime, 'grey') + ']';
    }

    this.push(file);

    cb();
  });
};
