// Master.js
var zmq = require("zeromq"),
	mDictionary = zmq.socket("rep");
//Direction Dictionary
var dDictionary = {
	["LBF"]: "tcp://127.0.0.1:3010",
	["LBQ"]: "tcp://127.0.0.1:3020",
	["QUEUE"]: "tcp://127.0.0.1:3030"
};

//We could initiate
mDictionary.bind("tcp://127.0.0.1:3000");
console.log("MASTER Start");

mDictionary.on("message", function(obj) {
	console.log(`Received Request: ${obj}`);
    // Send the message back as a reply to the server.
	const message = dDictionary[obj.toString("utf8")];
	if (message == null) {
		mDictionary.send("NaN");
	} else {	
		mDictionary.send(message);
	}
});