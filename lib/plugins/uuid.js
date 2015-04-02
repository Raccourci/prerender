var uuid = require('node-uuid');

module.exports = {
    beforePhantomRequest: function(req, res, next) {
        return next();
    }
};