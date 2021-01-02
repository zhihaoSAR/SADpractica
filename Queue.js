//Queue
const { json } = require("express");
const zmq = require("zeromq"),
	//Get IP socket
	gIP = new zmq.Request

//mPORT = IP Master
//sPORT = Self IP
const mPORT = "tcp://127.0.0.1:3000",
	sPORT = "tcp://127.0.0.1:3030";

const LBQDealer = new zmq.Dealer;    // Create PULL socket
var IpLBQ;

async function init() {
	console.log("Queue.js start");
	const msg = `LBQ`;
	console.log(`Request ${msg} IP`);
	gIP.send(msg);
	IpLBQ = (await gIP.receive()).toString()
	connectToLBQ(IpLBQ)
}

async function connectToLBQ(IP) {
	console.log("Connect to LBQ IP: "+IP.substr(1,IP.length-2));
	LBQDealer.connect(IP.substr(1,IP.length-2));
	
	LBQDealer.send("SIGINT");
}

init();