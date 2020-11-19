const http = require('http');
var get = {
    host: 'localhost',
    port: 8080,
    path: '/',
    method: 'GET'
  };

  var req = http.request(get, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log(chunk)
    });
  });
  
  req.end();