#!/usr/bin/env node
var prerender = require('./lib');

var server = prerender({
  waitAfterLastRequest: 5 * 1000,
  jsTimeout: 10 * 1000,
  port: 4000,
  noJsExecutionTimeout: 5 * 1000,
  workers: process.env.PHANTOM_CLUSTER_NUM_WORKERS,
  iterations: process.env.PHANTOM_WORKER_ITERATIONS || 10,
  phantomBasePort: process.env.PHANTOM_CLUSTER_BASE_PORT || 12300,
  messageTimeout: process.env.PHANTOM_CLUSTER_MESSAGE_TIMEOUT,
  phantomArguments: [
    "--load-images=false",
    "--ignore-ssl-errors=true",
    "--disk-cache=false"
  ]
});


// server.use(prerender.basicAuth());
// server.use(prerender.whitelist());
//server.use(prerender.blacklist());
server.use(prerender.uuid());
server.use(prerender.logger());
server.use(prerender.removeScriptTags());
server.use(prerender.httpHeaders());
server.use(prerender.mongoDBHtmlCache());
// server.use(prerender.inMemoryHtmlCache());
// server.use(prerender.s3HtmlCache());

server.start();
