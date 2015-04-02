var MongoClient = require('mongodb').MongoClient,
    htmlparser = require("htmlparser2");
    url = require("url"),
    os = require("os");

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
    var h1 = false;
    var isBusinessName = false;

    try{
      var parser = new htmlparser.Parser({
        onopentag: function(name, attribs){

          if(name === "title"){
            currentTag = name;
          }
          if(name === "link" && 'rel' in attribs && attribs.rel === "canonical"){
            canonical = attribs.href;
          }
          if(name === "meta" && 'name' in attribs && attribs.name === "description"){
            description = attribs.content;
          }
          if(name === "meta" && 'property' in attribs && attribs.property === "og:image"){
            image = attribs.content;
          }
          if(name === "h1" ){
            currentTag = "h1";
            isBusinessName = 'itemref' in attribs && attribs.itemref === "business-name";
          }
        },
        ontext: function(text){
          if(currentTag == 'title'){
            title = text;
          }
          if(currentTag == 'h1'){
            h1 = text;
          }
        },
        onclosetag: function(tagname){
          currentTag = false;
        }
      }, {decodeEntities: false});
      parser.write(req.prerender.documentHTML);
      parser.end();
      xmlparsed = true;

    }catch(err){
      console.log('Failed Parsing XML : ' + req.prerender.url, err);
    }

    console.log(req.connection.remoteAddress);
    this.cacheCollection.insert({
      url: req.prerender.url,
      domain: url.parse(req.prerender.url).hostname,
      document: req.prerender.documentHTML,
      title:title,
      canonical:canonical,
      description:description,
      image:image,
      h1:h1,
      isBusinessName:isBusinessName,
      xmlparsed:xmlparsed,
      innerIP:req.connection.remoteAddress,
      outerIP:req.headers['X-Real-IP'],
      handlerHost:os.hostname(),
      date:new Date()
    }, function (err) {
      if (err) throw err;
      console.log('Cached in mongo : ' + req.prerender.url);
      next();
    });
  }
};
