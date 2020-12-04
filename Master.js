// Master.js
var zmq = require("zeromq"),
	mDictionary = zmq.socket("router");

//Direction Dictionary
var dDictionary = {}

//We could initiate

mDictionary.bind("tcp://127.0.0.1:3030");
console.log("MASTER Start");


mDictionary.on("message", function(chain) {
	console.log("Keep Alive");
	console.log(chain)
});