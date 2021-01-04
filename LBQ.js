var zmq = require("zeromq")
const router = new zmq.Router
const dealer = new zmq.Dealer
const joinRequest = new zmq.Request
const JOINPORT = 3000
const ROUTERPORT = 3020
const DEALERPORT = 3021
const MASTERDIR = "tcp://"+"127.0.0.1"
const JOINDIR = MASTERDIR + ":"+JOINPORT
const MYDIR = "tcp://" +"127.0.0.1"
async function routeHandle(){
    for await (msg of router) {
      console.log(msg.toString())
      dealer.send(msg)
    }
  }
async function dealerHandle(){
    for await (msg of dealer) {
        console.log("res: "+ msg.toString())
        router.send(msg)
      }
}

async function inicialize(){
    await router.bind("tcp://*"+":" + ROUTERPORT)
    await dealer.bind("tcp://*"+":" + DEALERPORT)
    routeHandle()
    dealerHandle()
    process.on("SIGINT", () => {
        joinRequest.send(["LBQExit",MYDIR]).then(process.exit)
    })
    console.log("LBQ start")
}
joinRequest.connect(JOINDIR)
joinRequest.send(["LBQJoin", MYDIR])
joinRequest.receive().then(inicialize)

