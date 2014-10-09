var MongoClient = require('mongodb').MongoClient,
  ObjectID = require('mongodb').ObjectID,
  collection = null;

module.exports = {
  init: function () {
    var _this = this;
    MongoClient.connect('mongodb://phantomdb1.rc.prod:27017/test', function (err, db) {
      if (err) throw err;
      _this.db = db;
      _this.cacheCollection = db.collection('test_insert');
    })
  },

  beforePhantomRequest: function (req, res, next) {
    this.cacheCollection.findOne({url: req.prerender.url}, function (err, result) {
      if (!err && result) {
        console.log('Served from mongo cache : ' + req.prerender.url);
        res.send(200, result.document);
      } else {
        next();
      }
    });
  },

  afterPhantomRequest: function (req, res, next) {
    var _this = this;

    this.cacheCollection.insert({url: req.prerender.url, document: req.prerender.documentHTML}, function (err) {
      if (err) throw err;
      console.log('Cached in mongo : ' + req.prerender.url);
      next();
    });
  }
};