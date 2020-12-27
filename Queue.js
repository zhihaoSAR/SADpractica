//Queue
const zmq = require("zeromq"),
	gIP = zmq.socket("req"); //Get IP socket
gIP.connect("tcp://127.0.0.1:3000");
console.log("Queue.js start");

const LBQDealer = zmq.socket(`dealer`);    // Create PULL socket

//The Init and gIP socket it's replicable to all components who needs get another IP
gIP.on('message', function(msg) {
	console.log(`Message received: ${msg}`);
	let IP = msg.toString("utf8");
	if (IP != "NaN") {
		connectToLBQ(IP)
		//gIP.close()
	}
});

var counter = 0;
function init() {
	const msg = `LBQ`;
	console.log(`Request ${msg} IP`);
	gIP.send(msg);
}

function connectToLBQ(IP) {
	console.log("Connect to LBQ IP: ", IP);
	LBQDealer.bind(IP, function (msg) {
			
	});
}


init();

