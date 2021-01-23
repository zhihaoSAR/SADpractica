var zmq = require("zeromq")
const subscriber = new zmq.Subscriber
const req = new zmq.Request
const report = new zmq.Request
const SUBSCRIBEPORT = 3001
const QUEUEPORT = 3030
const REPORTPORT = 3000
const MASTERDIR = "tcp://"+"host.docker.internal"
const SUBSCRIBEDIR = MASTERDIR + ":"+SUBSCRIBEPORT
const REPORTDIR = MASTERDIR + ":" + REPORTPORT
var originalList = []
var queueList ={}
var index = 0
req.receiveTimeout = 10000
report.receiveTimeout = 5000
const estimateTime ={
  "echo" : 1000
}
function echo(param){
  const res = JSON.parse(param)
  console.log(res)
  return res[0]
}
const functions = {
  "echo":  echo
}
async function updateHandle(){
    for await ([topic, list] of subscriber) {
      queueList = JSON.parse(list)
      originalList = Object.keys(queueList)
      console.log("new list: " + originalList)
    }
}
async function mainLoop(){
  try{
    if(originalList[index]){
      req.connect(originalList + ":" + QUEUEPORT)
      req.send(["SOLICITED"])
      work = await req.receive()
      if(work[0].toString() === "NO WORK"){
        index++
        setTimeout(mainLoop);
        return
      }
	  if(!estimateTime[work[3].toString()]) {
		index++
		setTimeout(mainLoop);
		return
	  }
      req.send(["ESTIMATE TIME", estimateTime[work[3].toString()]])
      const status = await req.receive()
      if(status[0].toString() === "TIMEOUT REACHED"){
        index++
        setTimeout(mainLoop);
        return
      }
      const res = functions[work[3].toString()](work[4])
      req.send(["DONE",work[1],work[2],res])
      await req.receive()
      index++
      setTimeout(mainLoop);
    }
    else{
      index = 0
      setTimeout(mainLoop);
    }
  }catch(err) {
    let deadQueue = originalList[index]
    await report.send(["WorkerReport", deadQueue])
    if(queueList[deadQueue] !== "no replica"){
      originalList[index] = queueList[deadQueue]
    }
    console.log(deadQueue +" dead")
    report.receive().catch(() => {})
  }
  
  
}

async function inicialize(){
    updateHandle()
    setTimeout(mainLoop);
    console.log("Worker start")
}
report.connect(REPORTDIR)
subscriber.connect(SUBSCRIBEDIR)
subscriber.subscribe("QUEUELIST")
inicialize()



