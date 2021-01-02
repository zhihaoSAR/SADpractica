const zmq = require("zeromq")
const app = require('express')()
const joinRequest = new zmq.Request
const dealer = new zmq.Dealer
const subscripber = new zmq.Subscriber
//direccion de master deberia pasar por parametro
const joinPort = 3000
const subPort = 3001
const LBQport = 3020
const masterDir = "tcp://"+"127.0.0.1"
const joinDir = masterDir + ":"+joinPort
const subDir = masterDir + ":"+subPort
//const myDir = "tcp://"+"127.0.0.1"+":3040"
var clients = []

function generateId() {
  return Math.floor(Math.random() * 1048576);
}

async function dealerHandle(){
  for await (msg of dealer){
    clientId = msg.shift()
    clients[clientId.toString()].send(msg.toString())
    delete clients[clientId.toString()]
  }
}
async function subscriberHandle(){
  for await ([topic, list] of subscripber) {
    connect2LBQ(JSON.parse(list))
  }
}

function connect2LBQ(list) {
  for(dir of list){
    console.log("connecta a : " + dir +":"+LBQport)
    dealer.connect(dir +":"+LBQport) 
  }
}

async function inicialize(list){
  connect2LBQ(JSON.parse(list))
  app.get('/:method/:arg1', (req, res) => {
    clientId = generateId()
    while(clients[clientId.toString()]){
      clientId = generateId()
    }
    clients[clientId.toString()] = res
    console.log("request received, metodo: " + req.params['method'] +", parametros: "+ req.params['arg1'] )
    dealer.send([clientId,req.params['method'],req.params['arg1']])
  })
  await app.listen(3040,() =>{
    console.log("frontend start")
  })
  await subscripber.connect(subDir)
  await subscripber.subscribe("LBQJoin")
  dealerHandle()
  subscriberHandle()
}



joinRequest.connect(joinDir)
joinRequest.send(["FrontendJoin"])
joinRequest.receive().then(inicialize)
  

