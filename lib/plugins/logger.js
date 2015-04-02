var bunyan = require('bunyan');

module.exports = {
  onPhantomPageCreate: function (phantom, req, res, next) {
    phantom.set('onConsoleMessage', function (msg) {
      req.log.warn(msg);
    });
    next();
  }
};
