

// Master.js
const fs = require("fs")
const zmq = require("zeromq"),
	mDictionary = new zmq.Router,
	publisher = new zmq.Publisher
const masterPort = 3000
const pubPort = 3001
const masterDir = "127.0.0.1"
//Direction Dictionary
var dDictionary = {
	["LBF"]: [],
	["LBQ"]: [[],[]],
	["QUEUE"]: [[],[]],
	numQueues: [],
	numMax: 0,
	numReplica: 0,
	numOriginal: 0
};

function frontednJoin(){
	return JSON.stringify(dDictionary.LBQ[0])
}
function LBQJoin(msg){
	const dir = msg[3].toString()
	console.log("LBQ joined: " + dir)
	dDictionary.LBQ[0].push(dir)
	dDictionary.LBQ[1].push(0)
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	publisher.send(["LBQJoin",JSON.stringify(dDictionary.LBQ)])
	return "OK"
}
function LBQExit(msg) {
	const dir = msg[3].toString()
	const index = dDictionary.LBQ[0].indexOf(dir)
	if(index != -1){
		dDictionary.LBQ[0].splice(index,1)
		dDictionary.LBQ[1].splice(index,1)
	}
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
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
}
mDictionary.bind("tcp://"+masterDir+":"+masterPort)
.then(() => {
	publisher.bind("tcp://"+masterDir+":"+pubPort)
})
.then(() => {
	console.log("MASTER Start");
	mDictionaryHandle()
});






