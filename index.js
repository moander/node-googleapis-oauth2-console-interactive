var readline = require('readline');
var google = require('googleapis');
var async = require('async')
var https = require('https');

var OAuth2Client = google.auth.OAuth2;

module.exports = function (opts, callback) {
  opts = opts || {};

  if (!opts.noAppDefault) {
    google.auth.getApplicationDefault(function (err, result) {
      if (err) {
        offline_oauth2(opts, callback);
      } else {
        if (result.createScopedRequired && result.createScopedRequired()) {
          result = result.createScoped(opts.scope);
        }
        callback(null, result);
        return;
      }
    });
    return;
  }
  offline_oauth2(opts, callback);
};

function offline_oauth2(opts, callback) {
  opts.access_type = opts.access_type || 'offline';
  opts.redirectUri = opts.redirectUri || 'urn:ietf:wg:oauth:2.0:oob';

  var client = new OAuth2Client(opts.clientId, opts.clientSecret, opts.redirectUri, opts.opt_opts);
  //google.urlshortener('v1');
  async.waterfall([
    
    // Generates URL for consent page landing.
    async.constant(client.generateAuthUrl({
      access_type: opts.access_type,
      scope: opts.scope
    })),
    
    // Try to shorten url
    function (url, callback) {
      https.get('https://bitlyer.appspot.com/api/insert?url=' + encodeURIComponent(url), function (res) {
        var responseString = '';
        res.on('data', function (data) {
          responseString += data;
        });
        res.on('error', callback);
        res.on('end', function () {
          res = JSON.parse(responseString);
          if (res.kind === 'urlshortener#url' && res.id) {
            callback(null, res.id);
          } else {
            callback(null, url);
          }
        });
      });
    },
    
    // Tell user to visit consent page and enter code 
    function (url, callback) {
      console.log('Visit this url: ', url);

      var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Enter the code here:', function (code) {
        rl.close();
        callback(null, code);
      });
    },
    
    // Gets the access token for the given code
    function (code, callback) {
      client.getToken(code, callback);
    },

    // Return authenticated client to caller
    function (tokens) {
      client.setCredentials(tokens);
      arguments[arguments.length - 1](null, client);
    },

  ], callback);
};
