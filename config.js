//
// # Config
//

/* jslint node: true */
'use strict';

var fs    = require('fs');
var glob  = require('glob');
var _     = require('lodash');
var path  = require('path');
var async = require('async');
var yaml  = require('js-yaml');

//
// ## Load configuration
//
// Loads all configuration files at the given location and merges them into
// a single unit. The file named `config.yaml` will be loaded last and has
// the option to override settings set in the other configuration files. This
// is to allow all files but the main configuration file to be committed to
// the repo. `config.yaml` can then be used to inject API keys etc.
//
// * **configPath**, path to the configuration directory.
// * **callback**, called when done.
//
var Config = module.exports.config = function (configPath, callback) {
  this.config = {};

  var e = new Error();
  var self = this;
  configPath = path.join(configPath, '*.yaml');
  glob(configPath, function (err, files) {
    if (err) {
      callback(err);
      return;
    }

    async.waterfall([
      loadFiles(configPath, files),
      sortFiles,
      parseYaml,
      merge
    ], function (err, config) {
      self.config = config;
      callback(err);
    });
  });
};

//
// ## Get value
//
// Return the given value from the config. If the value is not set `null` is
// returned unless the `default` parameter is set in which case this is
// returned.
//
// * **key**, name of the item to get. Keypaths separated by `.` works.
// * **def**, default value to return if `key` is not found.
// * **src**, internal argument used when getting key paths.
//
Config.prototype.get = function (key, def, _src) {
  if (!_src) _src = this.config;
  var path = key.split('.');
  var res = def || null;
  do {
    key = path.shift();
    if (typeof _src === 'object') {
      if (typeof _src[key] !== 'undefined') {
        _src = _src[key];
      }
      else {
        _src = def || null;
        break;
      }
    }
    else {
      break;
    }
  } while (path.length);

  return _src;
};

//
// ## Hapi Integration
//
// Adds an instance of the configuration object to the Hapi plugin. Other
// plugins can then use `plugin.plugins.config.get(foo)` to get configuration
// items.
//
module.exports.register = function (plugin, options, next) {
  var conf = new Config(options.configPath, function (err) {
    plugin.expose('get', conf.get.bind(conf));
    next(err);
  });
};

// Load files
function loadFiles(configPath, files) {
  return function (cb) {
    async.map(files, function (file, next) {
      fs.readFile(file, { encoding: 'utf-8' }, function (err, data) {
        next(err, {
          file: file,
          data: data
        });
      });
    }, cb);
  };
}

// Sort files
function sortFiles(files, next) {
  function isConfig(file) {
    return (/config\.yaml$/).test(file);
  }
  files.sort(function (a, b) {
    if (isConfig(a.file)) return 1;
    else if (isConfig(b.file)) return -1;
    else return 0;
  });

  next(null, files);
}

// Parse YAML
function parseYaml(files, next) {
  async.map(files, function (file, callback) {
    var res, err;
    try {
      res = yaml.load(file.data);
    }
    catch (e) {
      err = e;
    }

    callback(err, res);
  }, next);
}

// Merge files
function merge(data, next) {
  var config = {};
  data.forEach(function (c) {
    config = _.merge(config, c);
  });

  next(null, config);
}

