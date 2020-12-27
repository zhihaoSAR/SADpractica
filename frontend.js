const zmq = require("zeromq")
const app = require('express')()
const joinRequest = new zmq.Request
const dealer = new zmq.Dealer
//direccion de master deberia pasar por parametro
const masterDir = "tcp://"+"127.0.0.1"+":3000"
//const myDir = "tcp://"+"127.0.0.1"+":3040"
var clients = []

function generateId() {
  return Math.floor(Math.random() * 1048576);
}

async function dealerHandle(){
  for await (msg of dealer){
    clientId = msg.shift()
    clients[clientId.toString()].send(msg.toString())
  }
}

function inicialize(list){

  console.log(JSON.parse(list))
  for(dir of JSON.parse(list)){
    console.log(dir)
    dealer.connect(dir) 
  }
  app.get('/:method/:arg1', (req, res) => {
    clientId = generateId()
    while(clients[clientId.toString()]){
      clientId = generateId()
    }
    clients[clientId.toString()] = res
    console.log("consulta recibido " + req.params['method'] + req.params['arg1'] )
    dealer.send([clientId,req.params['method'],req.params['arg1']])
  })
  app.listen(3040,() =>{
    console.log("frontend inicialized")
  })
  dealerHandle()
}



joinRequest.connect(masterDir)
joinRequest.send(["FrontendJoin"])
joinRequest.receive().then(inicialize)

