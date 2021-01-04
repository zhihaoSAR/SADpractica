//Queue
var zmq = require("zeromq")
var sha1 = require('crypto').createHash('sha1')
const syncDealer = new zmq.Dealer
const LBQDealer = new zmq.Dealer
const joinRequest = new zmq.Request
const queueRouter = new zmq.Router
const JOINPORT = 3000
const LBQPORT = 3021
const QUEUEPORT = 3030
const SYNCPORT = 3031
const MASTERDIR = "tcp://"+"127.0.0.1"
const JOINDIR = MASTERDIR + ":"+JOINPORT
const MYDIR = "tcp://" +"127.0.0.1"
const ESTIMATETIME = 3000
var state = "ORIGINAL"


const pendingList = []
const workingDict = []

var LBQDir = null
var syncInterval = null
async function LBQDealerHandle(){
    for await (msg of LBQDealer) {
		msg.map((content) =>{
			console.log(content.toString())
		})
		pendingList.push(msg)
    }
}
async function queueRouterHandle(){
    for await (msg of queueRouter) {
		const action = msg[2].toString()
		console.log("action : "+ msg.toString())
		if(action === "SOLICITED"){
			if(pendingList.length == 0){
				queueRouter.send([msg[0],"","NO WORK"])
				continue
			}
			const work = pendingList.shift()
			workingDict[msg[0]] = [work,setTimeout(() => {
				pendingList.unshift(workingDict[msg[0]][0])
				delete workingDict[msg[0]]
			},ESTIMATETIME)]
			console.log("sending")
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
			msg.splice(0,3)
			console.log("res: "+  msg)
			LBQDealer.send(msg)
		}
    }
}


async function inicialize(msg){
	res = JSON.parse(msg.toString())
	state = res[0]
	console.log(res)
    if(state === "ORIGINAL"){
		console.log("original")
		LBQDir = res[1] +":" + LBQPORT
		await LBQDealer.connect(LBQDir)
		await queueRouter.bind(MYDIR+":"+QUEUEPORT)
		await syncDealer.bind(MYDIR + ":" + SYNCPORT)
		LBQDealerHandle()
		queueRouterHandle()
	}
	else if(state === "REPLICA"){
		
	}
	else if(state === "REPEAT"){
		setTimeout(join,5000)
		return
	}
	process.on('SIGINT',() => {
		joinRequest.send(["QueueExit", state, MYDIR, LBQDir]).then(process.exit)
	})
	console.log("Queue Start")
}
function join(){
	joinRequest.connect(JOINDIR)
	joinRequest.send(["QueueJoin", MYDIR])
	joinRequest.receive().then(inicialize)
}
join()

