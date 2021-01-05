var zmq = require("zeromq")
const router = new zmq.Router
const dealer = new zmq.Dealer
const joinRequest = new zmq.Request
const lifeCheck = new zmq.Router
const JOINPORT = 3000
const ROUTERPORT = 3020
const DEALERPORT = 3021
const LIFECHECKPORT = 3022
const MASTERDIR = "tcp://"+"127.0.0.1"
const JOINDIR = MASTERDIR + ":"+JOINPORT
const MYDIR = "tcp://" +"127.0.0.1"

dealer.immediate = true
async function routeHandle(){
    for await (msg of router) {
      console.log(msg.toString())
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
    await router.bind("tcp://*"+":" + ROUTERPORT)
    await dealer.bind("tcp://*"+":" + DEALERPORT)
    await lifeCheck.bind("tcp://*"+":" + LIFECHECKPORT)
    routeHandle()
    dealerHandle()
    lifeCheckHandle()
    process.on("SIGINT", () => {
        joinRequest.send(["LBQExit",MYDIR]).then(process.exit)
    })
    console.log("LBQ start")
}
joinRequest.connect(JOINDIR)
joinRequest.send(["LBQJoin", MYDIR])
joinRequest.receive().then(inicialize)

