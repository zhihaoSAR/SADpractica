var zmq = require("zeromq")
const subscriber = new zmq.Subscriber
const req = new zmq.Request
const report = new zmq.Request
const SUBSCRIBEPORT = 3001
const QUEUEPORT = 3030
const MASTERDIR = "tcp://"+"127.0.0.1"
const SUBSCRIBEDIR = MASTERDIR + ":"+SUBSCRIBEPORT
var queueList = []
var index = 0
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
      queueList = Object.keys(JSON.parse(list))
      console.log("list updated: ")
      console.log(queueList)
    }
}
async function mainLoop(){
  console.log(queueList[index])
  if(queueList[index]){
    console.log("inside")
    req.connect(queueList + ":" + QUEUEPORT)
    console.log("inside2")
    req.send(["SOLICITED"])
    work = await req.receive()
    if(work[0].toString() === "NO WORK"){
      index++
      setTimeout(mainLoop);
      return
    }
    console.log(work.toString())
    req.send(["ESTIMATE TIME", estimateTime[work[3].toString()]])
    const status = await req.receive()
    console.log("status: "+status.toString())
    if(status[0].toString() === "TIMEOUT REACHED"){
      index++
      setTimeout(mainLoop);
      return
    }
    const res = functions[work[3].toString()](work[4])
    console.log(res)
    req.send(["DONE",work[1],work[2],res])
    await req.receive()
    index++
    setTimeout(mainLoop);
  }
  else{
    index = 0
    setTimeout(mainLoop);
  }
  
}

async function inicialize(){
    updateHandle()
    setTimeout(mainLoop);
    console.log("Worker start")
}
subscriber.connect(SUBSCRIBEDIR)
subscriber.subscribe("QUEUELIST")
inicialize()



