

// Master.js
const { dir } = require("console")
const fs = require("fs")
const zmq = require("zeromq"),
	mDictionary = new zmq.Router,
	publisher = new zmq.Publisher
const masterPort = 3000
const pubPort = 3001
const masterDir = "127.0.0.1"
const UPDATE_LIST_TIME = 10000
//Direction Dictionary
var dDictionary = {
	["LBQ"]: {},
	["QUEUE"]: {},
	numReplica: 0,
	numOriginal: 0
};

function queueJoin(msg){
	let state
	console.log("Queue: "+ msg[3].toString() +" want to join")
	if(dDictionary.numReplica < dDictionary.numOriginal){
		state = "REPLICA"
		let dir = null
		dDictionary.numReplica++
		for(key in dDictionary.QUEUE){
			if(!dDictionary.QUEUE[key]){
				dir = key
				break
			}  
		}
		dDictionary.QUEUE[dir] = msg[3].toString()
		fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
		return JSON.stringify([state,dir])
	}
	else {
		state = "ORIGINAL"
		let dir = null
		let numQueues = 99999999
		for(key in dDictionary.LBQ){
			if(numQueues > dDictionary.LBQ[key]){
				numQueues = dDictionary.LBQ[key]
				dir = key
			}  
		}
		if(dir){
			dDictionary.numOriginal++
			if(dDictionary.numMax < ++dDictionary.LBQ[dir]){
				dDictionary.numMax = dDictionary.LBQ[dir]
			}
			
			dDictionary.QUEUE[msg[3].toString()] = null
			fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
			return JSON.stringify([state,dir])
		}
		return JSON.stringify(["REPEAT"])
	}
}

function frontednJoin(){
	return JSON.stringify(Object.keys(dDictionary.LBQ))
}
function LBQJoin(msg){
	const dir = msg[3].toString()
	console.log("LBQ joined: " + dir)
	dDictionary.LBQ[dir] = 0
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	publisher.send(["LBQJoin",JSON.stringify(Object.keys(dDictionary.LBQ))])
	return "OK"
}
function LBQExit(msg) {
	const dir = msg[3].toString()
	delete dDictionary.LBQ[dir]
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	console.log("LBQ "+ dir +" exit")
}
function queueExit(msg) {
	const LBQDir = msg[5].toString()
	const queueDir = msg[3].toString()
	dDictionary.LBQ[LBQDir]--
	delete dDictionary.QUEUE[queueDir]
	dDictionary.numOriginal--
	console.log("Queue "+msg[4].toString() +" "+queueDir+" exit")
}
function workerReport(){

}
const functions = {
	"FrontendJoin":frontednJoin,
	"LBQJoin": LBQJoin,
	"LBQExit": LBQExit,
	"QueueJoin": queueJoin,
	"QueueExit": queueExit,
	"WorkerReport": workerReport
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
	setInterval(() => {
		console.log("send list")
		publisher.send(["QUEUELIST",JSON.stringify(dDictionary.QUEUE)])
	}, UPDATE_LIST_TIME);
});






