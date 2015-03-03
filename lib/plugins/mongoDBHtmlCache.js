var MongoClient = require('mongodb').MongoClient,
  xpath = require('xpath'),
  dom = require('xmldom').DOMParser;

module.exports = {
  init: function () {
    var _this = this;
    MongoClient.connect('mongodb://phantomdb1.rc.prod:27017/renders', function (err, db) {
      if (err) throw err;
      _this.db = db;
      _this.cacheCollection = db.collection('renders');
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

    var title = false;
    var canonical = false;
    var description = false;
    var image = false;
    var xmlparsed = false;

    try{
      var doc = new dom().parseFromString(req.prerender.documentHTML);

      xmlparsed = true;

      var titleQuery = xpath.select("//title/text()", doc);
      if(titleQuery.toString()){
        title = titleQuery.toString();
      }
      var canonicalQuery = xpath.select("//link[@rel='canonical']/@href", doc);
      if(canonicalQuery.value){
        canonical = canonicalQuery.value;
      }
      var descriptionQuery = xpath.select("//meta[@property='og:description']/@content", doc);
      if(descriptionQuery.value){
        description = descriptionQuery.value;
      }
      var imageQuery = xpath.select("//meta[@property='og:image']/@content", doc);
      if(imageQuery.value){
        image = imageQuery.value;
      }

    }catch(err){
      console.log('Failed extracting dom : ' + req.prerender.url, err);
    }

    this.cacheCollection.insert({
      url: req.prerender.url,
      document: req.prerender.documentHTML,
      title:title,
      canonical:canonical,
      description:description,
      image:image,
      xmlparsed:xmlparsed
    }, function (err) {
      if (err) throw err;
      console.log('Cached in mongo : ' + req.prerender.url);
      next();
    });
  }
};
