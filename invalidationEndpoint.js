var MongoClient = require('mongodb').MongoClient,
  ObjectID = require('mongodb').ObjectID,
  http = require('http'),
  url = require('url'),
  connect = require('connect'),
  connectRoute = require('connect-route'),
  invalidationPort = 5000;

var app = connect();
function decodeUrl(encodedUrl) {
  return new Buffer(encodedUrl, 'base64').toString('ascii');
}

MongoClient.connect('mongodb://phantomdb1.rc.prod:27017/test', function (err, db) {

  if (err) throw err;
  var cacheCollection = db.collection('test_insert');

  app.use(connectRoute(function (router) {
    router.get('/:encodedUrl', function (req, res, next) {

      var base64Url = req.params.encodedUrl;
      var url = decodeUrl(base64Url);

      cacheCollection.remove({url: url}, function (err) {
        console.log('Removing', url, err);
        res.writeHead(204);
        res.end();
      });
    });
  }));

  http.createServer(app).listen(invalidationPort, '127.0.0.1');
  console.log('Mongo Invalidation Front started on : ' + invalidationPort)
});