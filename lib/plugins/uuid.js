var uuid = require('node-uuid');

module.exports = {
    beforePhantomRequest: function(req, res, next) {
        req.reqId = uuid.v4();
        return next();
    }
};