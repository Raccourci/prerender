var MongoClient = require('mongodb').MongoClient,
  htmlparser = require("htmlparser2"),
  url = require("url"),
  os = require("os");

module.exports = {
  init: function () {
    var _this = this;
    MongoClient.connect('mongodb://phantomdb.rc.prod:27017/renders', function (err, db) {
      if (err) throw err;
      _this.newDb = db;
      _this.getCollection = function (prerenderUrl) {
        return _this.newDb.collection(url.parse(prerenderUrl).hostname);
      };
    });
    MongoClient.connect('mongodb://phantomdb1.rc.prod:27017/renders', function (err, db) {
      if (err) throw err;
      _this.oldDb = db;
      _this.cacheCollection = _this.oldDb.collection('renders');
    });
  },

  beforePhantomRequest: function (req, res, next) {
    var _this = this;

    _this.cacheCollection(req.prerender.url).findOne({url: req.prerender.url}, function (err, result) {

      if (!err && result) {

        req.log.info('Served From Cache');
        res.send(200, result.document);

        _this.getCollection(req.prerender.url).insert(result, function (err) {
          if (err) throw err;

          delete result.document;
          req.log.info('ReCached into new Mongo');
        });

      } else {

        _this.getCollection(req.prerender.url).findOne({url: req.prerender.url}, function (err, result) {
          if (!err && result) {
            req.log.info('Served From Cache');
            res.send(200, result.document);
          } else {
            req.log.info('Requesting Phantom');
            next();
          }
        });

      }

    });
  },

  afterPhantomRequest: function (req, res, next) {
    next();
    var _this = this;
    var title = false;
    var canonical = false;
    var description = false;
    var image = false;
    var xmlparsed = false;
    var h1 = false;
    var isBusinessName = false;
    var currentTag = false;

    try {
      var parser = new htmlparser.Parser({
        onopentag: function (name, attribs) {
          if (name === "title") {
            currentTag = name;
          }
          if (name === "link" && 'rel' in attribs && attribs.rel === "canonical") {
            canonical = attribs.href;
          }
          if (name === "meta" && 'name' in attribs && attribs.name === "description") {
            description = attribs.content;
          }
          if (name === "meta" && 'property' in attribs && attribs.property === "og:image") {
            image = attribs.content;
          }
          if (name === "h1") {
            currentTag = "h1";
            isBusinessName = 'itemref' in attribs && attribs.itemref === "business-name";
          }
        },
        ontext: function (text) {
          if (currentTag == 'title') {
            title = text;
          }
          if (currentTag == 'h1') {
            h1 = text;
          }
        },
        onclosetag: function (tagname) {
          currentTag = false;
        }
      }, {decodeEntities: false});
      parser.write(req.prerender.documentHTML);
      parser.end();
      xmlparsed = true;

    } catch (err) {
      req.log.warn({err: err}, 'Failed Parsing XML');
    }

    var isSheetUrl = /.*[\-]+([0-9]{1,7}).*/.test(req.prerender.url);

    var report = {
      url: req.prerender.url,
      domain: url.parse(req.prerender.url).hostname,
      document: req.prerender.documentHTML,
      title: title,
      canonical: canonical,
      description: description,
      image: image,
      h1: h1,
      isBusinessName: isBusinessName,
      xmlparsed: xmlparsed,
      innerIP: req.connection.remoteAddress,
      outerIP: req.headers['x-real-ip'],
      headers: req.headers,
      handlerHost: os.hostname(),
      date: new Date(),
      isSheetUrl: isSheetUrl
    };

    report.playlistId = req.log.DrupalAngularConfig;

    if (isSheetUrl) {
      report.sheetId = /.*[\-]+([0-9]{1,7}).*/.test(req.prerender.url)[1];
    }
    if ('drupalAngularConfig' in req) {
      report.drupalAngularConfig = req.drupalAngularConfig;
    }
    _this.getCollection(req.prerender.url).insert(report, function (err) {
      if (err) throw err;
      delete report.document;
      req.log.info({data: report}, 'Cached into Mongo');
    });
  }
};
