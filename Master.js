

// Master.js
const fs = require("fs")
const zmq = require("zeromq"),
	mDictionary = new zmq.Router,
	publisher = new zmq.Publisher
//Direction Dictionary
var dDictionary = {
	["LBF"]: [],
	["LBQ"]: [],
	["QUEUE"]: []
};

function frontednJoin(){
	return JSON.stringify(dDictionary.LBQ)
}
function LBQJoin(msg){
	const dir = msg[3].toString()
	console.log("LBQ joined: " + dir)
	dDictionary.LBQ.push(dir)
	fs.writeFileSync("dDictionary.json", JSON.stringify(dDictionary))
	publisher.send(["LBQJoin",JSON.stringify(dDictionary.LBQ)])
	return "OK"
}
function LBQExit(msg) {
	const dir = msg[3].toString()
	const index = dDictionary.LBQ.indexOf(dir)
	if(index != -1){
		dDictionary.LBQ.splice(index,1)
	}
	fs.writeFileSync("dDictionary.json", JSON.stringify(dDictionary))
	console.log("LBQ "+index +" "+ dir +" exit")
}
const functions = {
	"FrontendJoin":frontednJoin,
	"LBQJoin": LBQJoin,
	"LBQExit": LBQExit
}

async function mDictionaryHandle(){
	for await(msg of mDictionary){
		mDictionary.send([msg[0],"",functions[msg[2].toString()](msg)])
	}
}

//We could initiate
if(fs.existsSync("dDictionary.json")){
	dDictionary = JSON.parse(fs.readFileSync("dDictionary.json"))
	for(var k in dDictionary) {
		console.log("Name: ", k, " IP: ", dDictionary[k]);
	}
}
mDictionary.bind("tcp://127.0.0.1:3000")
.then(() => {
	publisher.bind("tcp://127.0.0.1:3001")
})
.then(() => {
	console.log("MASTER Start");
	mDictionaryHandle()
});






