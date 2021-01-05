

// Master.js
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
	ORIGINALQUEUE:{},
	numReplica: 0,
	numOriginal: 0,
	
};

function queueJoin(msg){
	let state
	console.log("Queue: "+ msg[3].toString() +" want to join")
	if(dDictionary.numReplica < dDictionary.numOriginal){
		state = "REPLICA"
		let dir = null
		dDictionary.numReplica++
		for(key in dDictionary.QUEUE){
			if(dDictionary.QUEUE[key] === "no replica"){
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
		let dir = searchLBQ()
		if(dir){
			dDictionary.numOriginal++
			dDictionary.LBQ[dir]++
			dDictionary.QUEUE[msg[3].toString()] = "no replica"
			dDictionary.ORIGINALQUEUE[msg[3].toString()] = dir
			fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
			return JSON.stringify([state,dir])
		}
		return JSON.stringify(["REPEAT"])
	}
}
function searchLBQ(){
	let numQueues = 99999999
	let dir = null
	for(key in dDictionary.LBQ){
		if(numQueues > dDictionary.LBQ[key]){
			numQueues = dDictionary.LBQ[key]
			dir = key
		}  
	}
	return dir
}
function frontednJoin(){
	console.log("frontend joined")
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
	const queueDir = msg[4].toString()
	const queueState = msg[3].toString()
	if(queueState === "ORIGINAL")
	{
		removeOriginalQueue(queueDir)
	}
	else{
		dDictionary.QUEUE[LBQorSyncDir] = null
		dDictionary.numReplica--
	}
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	console.log("Queue "+msg[4].toString() +" "+queueDir+" exit")
}
function soliciteNewLBQ(msg){
	const deadLBQ = msg[3].toString()
	const queueDir = msg[4].toString()
	delete dDictionary.LBQ[deadLBQ]
	let newDir = searchLBQ()
	dDictionary.ORIGINALQUEUE[queueDir] = newDir
	console.log("LBQ: "+deadLBQ +" dead, " + queueDir + "solicite new LBQ")
	if(newDir){
		dDictionary.LBQ[newDir]++
		fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
		return JSON.stringify(["NEW LBQ",newDir])
	}
	else{
		return JSON.stringify(["NO LBQ"])
	}
}
function deadQueue(msg){
	const queueDir = msg[4].toString()
	removeOriginalQueue(queueDir)
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	console.log("try delete queue " + queueDir)
	return queueJoin(msg)
}
function removeOriginalQueue(queueDir){
	const lbqDir = dDictionary.ORIGINALQUEUE[queueDir]
	if(lbqDir){
		if(dDictionary.LBQ[lbqDir])
			dDictionary.LBQ[lbqDir]--
	}
	const replica = dDictionary.QUEUE[queueDir]
	if(replica && replica !== "no replica"){
		dDictionary.numReplica--
	}
	delete dDictionary.QUEUE[queueDir]
	delete dDictionary.ORIGINALQUEUE[queueDir]
	if(replica)
		dDictionary.numOriginal--
}
function becomeOriginal(msg){
	const originalDir = msg[4].toString()
	removeOriginalQueue(originalDir)
	const queueDir = msg[3].toString()
	const lbqDir = msg[5].toString()
	dDictionary.ORIGINALQUEUE[queueDir] = lbqDir
	dDictionary.LBQ[lbqDir]++
	dDictionary.QUEUE[queueDir] = "no replica"
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	console.log(queueDir +  " become ORIGINAL")
	return
}
function workerReport(msg){
	const queueDir = msg[3].toString()
	removeOriginalQueue(queueDir)
	fs.writeFileSync("dDictionary.json",JSON.stringify(dDictionary))
	console.log("try delete queue " + queueDir)
	return "OK"
}
const functions = {
	"FrontendJoin":frontednJoin,
	"LBQJoin": LBQJoin,
	"LBQExit": LBQExit,
	"QueueJoin": queueJoin,
	"QueueExit": queueExit,
	"WorkerReport": workerReport,
	"SoliciteNewLBQ": soliciteNewLBQ,
	"DeadQueue": deadQueue,
	"BecomeOriginal": becomeOriginal
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






