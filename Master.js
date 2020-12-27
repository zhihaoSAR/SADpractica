const { json } = require("express");

// Master.js
var zmq = require("zeromq"),
	mDictionary = new zmq.Router
//Direction Dictionary
var dDictionary = {
	["LBF"]: [],
	["LBQ"]: ["tcp://localhost:3020"],
	["QUEUE"]: []
};

function frontednJoin(){
	return JSON.stringify(dDictionary.LBQ)
}
const functions = {
	"FrontendJoin":frontednJoin
}

async function mDictionaryHandle(){
	for await(msg of mDictionary){
		mDictionary.send([msg[0],"",functions[msg[2].toString()]()])
	}
}


//We could initiate
mDictionary.bind("tcp://127.0.0.1:3000").then(() => {
	console.log("MASTER Start");
	mDictionaryHandle()
});






