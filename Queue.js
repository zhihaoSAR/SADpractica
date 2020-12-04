//Queue
var zmq = require("zeromq"),
	gIp = zmq.socket("req");

gIp.connect("tcp://127.0.0.1:3030");
console.log("WorkStart");

gIp.on('message', function(data) {
	console.log('IP recibida: ' + data.toString('utf8'));
});


gIp.send("some work");

