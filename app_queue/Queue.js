const { connect } = require("http2")
var zmq = require("zeromq")
var sha1 = require('crypto').createHash('sha1')
const syncDealer = new zmq.Dealer
const LBQDealer = new zmq.Dealer
const joinRequest = new zmq.Request
const queueRouter = new zmq.Router
const JOINPORT = 3000
const LBQPORT = 3021
const LBQLIFECHECKPORT = 3022
const QUEUEPORT = 3030
const SYNCPORT = 3031
const MASTERDIR = "tcp://"+"host.docker.internal"
const JOINDIR = MASTERDIR + ":"+JOINPORT
const MYDIR = "tcp://" +"host.docker.internal"
const HEARDIR = "tcp://0.0.0.0"
const ESTIMATETIME = 3000
var state = "ORIGINAL"
var pause = true
var syncStart = false

const resList = []
const pendingList = []
const workingDict = []

var LBQDir = null
var SYNCDIR = null

LBQDealer.immediate = true
LBQDealer.reconnectInterval = -1
//syncDealer.receiveTimeout = 3000
syncDealer.reconnectInterval = -1

async function sendRes(){
	if(resList.length > 0){
		if(pause){
			setTimeout(sendRes, 5000);
			return
		}
		await LBQDealer.send(resList.shift())
		if(syncStart){
			await syncDealer.send(["send"])
		}
		setTimeout(sendRes)
	}
}

async function LBQDealerHandle(){
    for await (msg of LBQDealer) {
		console.log("request from LBQ: "+ msg.toString())
		pendingList.push(msg)
    }
}
async function syncHandle() {
	for await (msg of syncDealer){
		const command = msg[0].toString()
		if(command === "SYNC START")
		{
			syncDealer.send(["start",JSON.stringify([pendingList,workingDict,resList,LBQDir])])
			syncStart = true
			continue
		}
		if(syncStart){
			if(command === "shift"){
				const work = pendingList.shift()
				workingDict[msg[1]] = work
				continue
			}
			if(command === "unshift"){
				pendingList.unshift(workingDict[msg[1]])
				delete workingDict[msg[1]]
				continue
			}
			if(command === "res"){
				delete workingDict[msg[1]]
				resList.push(msg[2])
				continue
			}
			if(command === "send"){
				resList.shift()
				continue
			}
		}
	}
}
async function queueRouterHandle(){
    for await (msg of queueRouter) {
		for(let i = 0; i < msg.length; ++i) {
			console.log("queueRouterHandle ", msg[i].toString())
		}
		const action = msg[2].toString()
		if(state === "REPLICA"){
			queueRouter.send([msg[0],"","NO WORK"])
			continue
		}
		if(action === "SOLICITED"){
			if(pendingList.length == 0){
				queueRouter.send([msg[0],"","NO WORK"])
				continue
			}
			const work = pendingList.shift()
			workingDict[msg[0]] = [work,setTimeout(() => {
				if(syncStart){
					syncDealer.send(["unshift",msg[0]])
				}
				pendingList.unshift(workingDict[msg[0]][0])
				delete workingDict[msg[0]]
			},ESTIMATETIME)]
			if(syncStart){
				syncDealer.send(["shift", msg[0]])
			}
			queueRouter.send([msg[0],"","WORK"].concat(work))
			continue
		}
		if(action === "ESTIMATE TIME"){
			if(!workingDict[msg[0]]){
				queueRouter.send(msg[0],"","TIMEOUT REACHED")
				continue
			}
			const time = parseInt(msg[3].toString())
			const work = workingDict[msg[0]][0]
			clearTimeout(workingDict[msg[0]][1])
			workingDict[msg[0]] = [work,setTimeout(() => {
				if(syncStart){
					syncDealer.send(["unshift",msg[0]])
				}
				pendingList.unshift(workingDict[msg[0]][0])
				delete workingDict[msg[0]]
			},time)]
			queueRouter.send([msg[0],"", "OK"])
			continue
		}
		if(action === "DONE"){
			if(!workingDict[msg[0]]){
				queueRouter.send(msg[0],"","TIMEOUT REACHED")
				continue
			}
			clearTimeout(workingDict[msg[0]][1])
			delete workingDict[msg[0]]
			queueRouter.send([msg[0],"","THANKS"])
			const id = msg[0]
			msg.splice(0,3)
			if(syncStart){
				syncDealer.send(["res",id,msg])
			}
			resList.push(msg)
			setTimeout(sendRes)
		}
    }
}

async function connect2LBQ(dir){
	let success = false
	LBQDir = dir
	while(!success){
		let check = new zmq.Request
		check.receiveTimeout = 3000
		check.linger = 0
		try{
			if(LBQDir == null){
				throw new Error("no lbq")
			}
			console.log("LBQDIR: ", LBQDir+":"+ LBQLIFECHECKPORT)
			await check.connect(LBQDir+":"+ LBQLIFECHECKPORT)
			await check.send("ARE YOU ACTIVE")
			await check.receive()
		} catch(e){
			await check.close()
			console.log("Solicited New LBQ")
			await joinRequest.send(["SoliciteNewLBQ", LBQDir,MYDIR])
			let msg = await joinRequest.receive()
			let res = JSON.parse(msg.toString())
			if(res[0] === "NEW LBQ"){
				LBQDir = res[1]
			}
			else{
				LBQDir = null
			}
			continue
		}
		success = true
		await check.close()
	}
	
	if (LBQDir != null) {
		await LBQDealer.connect(LBQDir + ":" +LBQPORT)
		pause = false
	}
	console.log("Finished connect2LBQ of: ", LBQDir, ", Original: ", dir)
	
	return
}

function syncDisconnect(){
	syncDealer.events.on("disconnect", async () =>{
		if(state ==="ORIGINAL"){
			syncStart = false
			await joinRequest.send(["QueueExit", "REPLICA", SYNCDIR, MYDIR])
			joinRequest.receive()
		}
		else{
			state = "ORIGINAL"
			await joinRequest.send(["BecomeOriginal", MYDIR,SYNCDIR,LBQDir])
			joinRequest.receive()
			for(work of workingDict){
				pendingList.unshift(work[0])
			}
			workingDict = {}
			await queueRouter.bind(HEARDIR+":"+QUEUEPORT)

			await syncDealer.bind(HEARDIR + ":" + SYNCPORT)
			await connect2LBQ(LBQDir)
			
			LBQDealerHandle()
			LBQDealer.events.on("disconnect",() => {
				pause = true
				connect2LBQ(LBQDir)
				console.log("Try 2 Connect2LBQ of ", LBQDir)
			})
			queueRouterHandle()
		
			console.log("Queue becomme ORIGINAL")
		}
	})
}
async function inicialize(msg){
	res = JSON.parse(msg.toString())
	state = res[0]
	process.on('SIGINT',() => {
		joinRequest.send(["QueueExit", state, MYDIR, res[1]]).then(process.exit)
	})
	console.log(res)
    if(state === "ORIGINAL"){
		console.log("original")
		await connect2LBQ(res[1])
		await queueRouter.bind(HEARDIR+":"+QUEUEPORT)
		await syncDealer.bind(HEARDIR + ":" + SYNCPORT)
		LBQDealerHandle()
		LBQDealer.events.on("disconnect",() => {
			pause = true
			connect2LBQ(LBQDir)
		})
		
		queueRouterHandle()
		syncHandle()
		syncDisconnect()
		console.log("Queue Start as ORIGINAL")
	}
	else if(state === "REPLICA"){
		console.log("Dirección LBQ:" +LBQDir)
		console.log("replica")
		SYNCDIR = res[1]
		try{
			await syncDealer.connect(SYNCDIR + ":" + SYNCPORT)
			await syncDealer.send("SYNC START")
			
			syncDealer.receiveTimeout = 3000
			let content = await syncDealer.receive()
			syncDealer.receiveTimeout = -1
			
			if(content[0].toString() === "start")
			{
				const copy = JSON.parse(content[1].toString())
				pendingList = copy[0]
				workingDict = copy[1]
				resList = copy[2]
				LBQDir = LBQDir
				syncStart = true
			}
			else{
				console.log("Exit")
				process.exit()
			}
		} catch(err) {
			console.log("Error: ",err);
			await joinRequest.send(["DeadQueue",MYDIR, SYNCDIR])
			syncDealer.receiveTimeout = -1
			return joinRequest.receive().then(inicialize)
		}
		queueRouterHandle()
		syncHandle()
		syncDisconnect()
		console.log("Queue Start as REPLICA")
		
	}
	else if(state === "REPEAT"){
		setTimeout(join,5000)
		return
	}
	console.log("Finished FirstInstance");
}
function join(){
	joinRequest.connect(JOINDIR)
	joinRequest.send(["QueueJoin", MYDIR])
	joinRequest.receive().then(inicialize)
}
join()