let http = require('follow-redirects').http;
let https = require('follow-redirects').https;
import {normalizeInput} from 'embark-utils';

function dirname() {
  const path = require('path');
  return path.dirname.apply(path.dirname, arguments);
}

function filesMatchingPattern(files) {
  const globule = require('globule');
  return globule.find(files, {nonull: true});
}

function fileMatchesPattern(patterns, intendedPath) {
  const globule = require('globule');
  return globule.isMatch(patterns, intendedPath);
}

function httpGetRequest(httpObj, url, callback) {
  httpObj.get(url, function (res) {
    let body = '';
    res.on('data', function (d) {
      body += d;
    });
    res.on('end', function () {
      callback(null, body);
    });
  }).on('error', function (err) {
    callback(err);
  });
}

function httpGet(url, callback) {
  httpGetRequest(http, url, callback);
}

function httpsGet(url, callback) {
  httpGetRequest(https, url, callback);
}

function httpGetJson(url, callback) {
  httpGetRequest(http, url, function (err, body) {
    try {
      let parsed = body && JSON.parse(body);
      return callback(err, parsed);
    } catch (e) {
      return callback(e);
    }
  });
}

function httpsGetJson(url, callback) {
  httpGetRequest(https, url, function (err, body) {
    try {
      let parsed = JSON.parse(body);
      return callback(err, parsed);
    } catch (e) {
      return callback(e);
    }
  });
}

function getJson(url, cb) {
  if (url.indexOf('https') === 0) {
    return httpsGetJson(url, cb);
  }
  httpGetJson(url, cb);
}

function cd(folder) {
  const shelljs = require('shelljs');
  shelljs.cd(folder);
}

function sed(file, pattern, replace) {
  const shelljs = require('shelljs');
  shelljs.sed('-i', pattern, replace, file);
}

function downloadFile(url, dest, cb) {
  const o_fs = require('fs-extra');
  var file = o_fs.createWriteStream(dest);
  (url.substring(0, 5) === 'https' ? https : http).get(url, function (response) {
    if (response.statusCode !== 200) {
      cb(`Download failed, response code ${response.statusCode}`);
      return;
    }
    response.pipe(file);
    file.on('finish', function () {
      file.close(cb);
    });
  }).on('error', function (err) {
    o_fs.unlink(dest);
    cb(err.message);
  });
}

function extractTar(filename, packageDirectory, cb) {
  const o_fs = require('fs-extra');
  const tar = require('tar');
  o_fs.createReadStream(filename).pipe(
    tar.x({
      strip: 1,
      C: packageDirectory
    }).on('end', function () {
      cb();
    })
  );
}

function extractZip(filename, packageDirectory, opts, cb) {
  const decompress = require('decompress');

  decompress(filename, packageDirectory, opts).then((_files) => {
    cb();
  });
}

function getExternalContractUrl(file,providerUrl) {
  const constants = require('embark-core/constants');
  let url;
  const RAW_URL = 'https://raw.githubusercontent.com/';
  const DEFAULT_SWARM_GATEWAY = 'https://swarm-gateways.net/';
  const MALFORMED_SWARM_ERROR = 'Malformed Swarm gateway URL for ';
  const MALFORMED_ERROR = 'Malformed Github URL for ';
  const MALFORMED_IPFS_ERROR = 'Malformed IPFS URL for ';
  const IPFS_GETURL_NOTAVAILABLE = 'IPFS getUrl is not available. Please set it in your storage config. For more info: https://embark.status.im/docs/storage_configuration.html';
  if (file.startsWith('https://github')) {
    const match = file.match(/https:\/\/github\.[a-z]+\/(.*)/);
    if (!match) {
      console.error(MALFORMED_ERROR + file);
      return null;
    }
    url = `${RAW_URL}${match[1].replace('blob/', '')}`;
  } else if (file.startsWith('ipfs')) {
    if(!providerUrl) {
      console.error(IPFS_GETURL_NOTAVAILABLE);
      return null;
    }
    let match = file.match(/ipfs:\/\/([-a-zA-Z0-9]+)\/(.*)/);
    if(!match) {
      match = file.match(/ipfs:\/\/([-a-zA-Z0-9]+)/);
      if(!match) {
        console.error(MALFORMED_IPFS_ERROR + file);
        return null;
      }
    }
    let matchResult = match[1];
    if(match[2]) {
      matchResult += '/' + match[2];
    }
    url = `${providerUrl}${matchResult}`;
    return {
      url,
      filePath: constants.httpContractsDirectory + matchResult
    };
  } else if (file.startsWith('git')) {
    // Match values
    // [0] entire input
    // [1] git://
    // [2] user
    // [3] repository
    // [4] path
    // [5] branch
    const match = file.match(
      /(git:\/\/)?github\.[a-z]+\/([-a-zA-Z0-9@:%_+.~#?&=]+)\/([-a-zA-Z0-9@:%_+.~#?&=]+)\/([-a-zA-Z0-9@:%_+.~?\/&=]+)#?([a-zA-Z0-9\/_.-]*)?/
    );
    if (!match) {
      console.error(MALFORMED_ERROR + file);
      return null;
    }
    let branch = match[5];
    if (!branch) {
      branch = 'master';
    }
    url = `${RAW_URL}${match[2]}/${match[3]}/${branch}/${match[4]}`;
  } else if (file.startsWith('http')) {
    url = file;
  } else if(file.startsWith('bzz')){
    if(!providerUrl) {
      url = DEFAULT_SWARM_GATEWAY + file;
    } else {
      let match = file.match(/bzz:\/([-a-zA-Z0-9]+)\/(.*)/);
      if(!match){
        match = file.match(/bzz:\/([-a-zA-Z0-9]+)/);
        if(!match){
          console.log(MALFORMED_SWARM_ERROR + file);
          return null;
        }
      }
      url = providerUrl + '/' + file;
    }
  } else {
    return null;
  }
  const match = url.match(
    /\.[a-z]+\/([-a-zA-Z0-9@:%_+.~#?&\/=]+)/
  );
  return {
    url,
    filePath: constants.httpContractsDirectory + match[1]
  };
}

function isValidDomain(v) {
  // from: https://github.com/miguelmota/is-valid-domain
  if (typeof v !== 'string') return false;

  var parts = v.split('.');
  if (parts.length <= 1) return false;

  var tld = parts.pop();
  var tldRegex = /^(?:xn--)?[a-zA-Z0-9]+$/gi;

  if (!tldRegex.test(tld)) return false;

  var isValid = parts.every(function(host) {
    var hostRegex = /^(?!:\/\/)([a-zA-Z0-9]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])$/gi;

    return hostRegex.test(host);
  });

  return isValid;
}

function groupBy(array, key) {
  return array.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

function interceptLogs(consoleContext, logger) {
  let context = {};
  context.console = consoleContext;

  context.console.log = function () {
    logger.info(normalizeInput(arguments));
  };
  context.console.warn = function () {
    logger.warn(normalizeInput(arguments));
  };
  context.console.info = function () {
    logger.info(normalizeInput(arguments));
  };
  context.console.debug = function () {
    // TODO: ue JSON.stringify
    logger.debug(normalizeInput(arguments));
  };
  context.console.trace = function () {
    logger.trace(normalizeInput(arguments));
  };
  context.console.dir = function () {
    logger.dir(normalizeInput(arguments));
  };
}

function getWindowSize() {
  const windowSize = require('window-size');
  if (windowSize) {
    return windowSize.get();
  }

  return {width: 240, height: 75};
}

function isConstructor(obj) {
  return !!obj.prototype && !!obj.prototype.constructor.name;
}

function isEs6Module(module) {
  return (typeof module === 'function' && isConstructor(module)) || (typeof module === 'object' && typeof module.default === 'function' && module.__esModule);
}

function urlJoin(url, path) {
  let urlChunks = url.split('/');
  let levels = path.split('../');

  // remove relative path parts from end of url
  urlChunks = urlChunks.slice(0, urlChunks.length - levels.length);

  // remove relative path parts from start of match
  levels.splice(0, levels.length - 1);

  // add on our match so we can join later
  urlChunks = urlChunks.concat(levels.join().replace('./', ''));

  return urlChunks.join('/');
}

module.exports = {
  dirname,
  filesMatchingPattern,
  fileMatchesPattern,
  httpGet,
  httpsGet,
  httpGetJson,
  httpsGetJson,
  getJson,
  isValidDomain,
  cd,
  sed,
  downloadFile,
  extractTar,
  extractZip,
  getExternalContractUrl,
  normalizeInput,
  groupBy,
  interceptLogs,
  getWindowSize,
  isEs6Module,
  urlJoin
};
