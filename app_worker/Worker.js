var zmq = require("zeromq")
const subscriber = new zmq.Subscriber
const report = new zmq.Request
const SUBSCRIBEPORT = 3001
const QUEUEPORT = 3030
const REPORTPORT = 3000
const MASTERDIR = "tcp://"+"172.28.0.2"
const SUBSCRIBEDIR = MASTERDIR + ":"+SUBSCRIBEPORT
const REPORTDIR = MASTERDIR + ":" + REPORTPORT
var originalList = []
var queueList ={}
var index = 0
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
      console.log("new list: " + JSON.stringify(queueList))
    }
}

async function queueDown(err,deadQueue){
  console.log("Letal error: ", err)
  console.log(deadQueue, "dead")
  await report.send(["WorkerReport", deadQueue])
  if(queueList[deadQueue] !== "no replica"){
    originalList[index] = queueList[deadQueue]
  }
  await report.receive().catch(() => {})
  req.close()
  index++
  setTimeout(mainLoop,1000);
}

async function mainLoop(){
  try{
    var queueDir = originalList[index]
    if(queueDir){
    //console.log("Solicitando Trabajo: ", originalList)
    req = new zmq.Request
    req.receiveTimeout = 10000
	  req.connect(originalList[index] + ":" + QUEUEPORT)
	  req.send(["SOLICITED"])
    var work = null
    try{
      work = await req.receive()
    }
    catch (err){
      return queueDown(err,queueDir)
    }
    if(work[0].toString() === "NO WORK"){
      req.close()
      index++
      setTimeout(mainLoop);
      return
    }
	  if(!estimateTime[work[3].toString()]) {
      req.send(["NOT SUPPORT"])
      req.close()
      index++
      setTimeout(mainLoop);
      try{
        await req.receive()
      }
      catch (err){
        return queueDown(err,queueDir)
      }
      return
	  }
    req.send(["ESTIMATE TIME", estimateTime[work[3].toString()]])
    var status = null
    try {
      status = await req.receive().catch(queueDown)
    }
    catch (err) {
      return queueDown(err,queueDir)
    }
    if(status[0].toString() === "TIMEOUT REACHED"){
      req.close()
      index++
      setTimeout(mainLoop);
      return
    }

    const res = functions[work[3].toString()](work[4])
    req.send(["DONE",work[1],work[2],res])
    try{
      await req.receive()
    }
    catch (err){
      return queueDown(err,queueDir)
    }
    req.close()
    index++
    setTimeout(mainLoop);

    }
    else{
      index = 0
      setTimeout(mainLoop);
    }
  }catch(err) {
	  console.log("Letal error: ", err)
    req.close()
    index++
    setTimeout(mainLoop);
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
