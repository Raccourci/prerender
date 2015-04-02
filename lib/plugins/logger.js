var bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'phantomServerConsoleErrors'});

module.exports = {
  onPhantomPageCreate: function (phantom, req, res, next) {
    var disLog = log.child({reqId:req.reqId});
    console.log(req.prerender.url, req.reqId);
    phantom.set('onConsoleMessage', function (msg) {
      disLog.warn(msg);
    });
    next();
  }
};
