var zmq = require("zeromq")

var address,
    ifaces = require('os').networkInterfaces();
for (var dev in ifaces) {
    ifaces[dev].filter((details) => details.family === 'IPv4' && details.internal === false ? address = details.address: undefined);
}
console.log("My Address: ", address);

const router = new zmq.Router
const dealer = new zmq.Dealer
const joinRequest = new zmq.Request
const lifeCheck = new zmq.Router
const JOINPORT = 3000
const ROUTERPORT = 3020
const DEALERPORT = 3021
const LIFECHECKPORT = 3022
const MASTERDIR = "tcp://"+"172.28.0.2"
const JOINDIR = MASTERDIR + ":"+JOINPORT
const MYDIR = "tcp://" + address

dealer.immediate = true
async function routeHandle(){
    for await (msg of router) {
      console.log("fromRouter: ", msg.toString())
      await dealer.send(msg)
    }
  }
async function dealerHandle(){
    for await (msg of dealer) {
        console.log("res: "+ msg.toString())
        await router.send(msg)
      }
}

async function lifeCheckHandle(){
  for await (msg of lifeCheck) {
    console.log("queue join "+ msg.toString())
    await lifeCheck.send(msg)
  }
}

async function inicialize(){
    await router.bind("tcp://0.0.0.0"+":" + ROUTERPORT)
    await dealer.bind("tcp://0.0.0.0"+":" + DEALERPORT)
    await lifeCheck.bind("tcp://0.0.0.0"+":" + LIFECHECKPORT)
    routeHandle()
    dealerHandle()
    lifeCheckHandle()
    process.on("SIGTERM", () => {
      console.log("i'm exiting")
      joinRequest.send(["LBQExit",MYDIR]).then(process.exit)
  })
    console.log("LBQ start")
}
joinRequest.connect(JOINDIR)
joinRequest.send(["LBQJoin", MYDIR])
joinRequest.receive().then(inicialize)

