const http = require('http');
var get = {
    host: 'host.docker.internal',
    port: 3040,
    path: '/echo/holamundo',
    method: 'GET'
};

  var req = http.request(get, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log(chunk)
    });
  });
  
  req.end();
