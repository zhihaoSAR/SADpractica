var zmq = require("zeromq")
const router = new zmq.Router
const joinPort = 3000
const masterDir = "tcp://"+"127.0.0.1"
const joinDir = masterDir + ":"+joinPort
const joinRequest = new zmq.Request
const myDir = "tcp://" +"127.0.0.1"+":3020"
async function routeHandle(){
    for await (msg of router) {
      router.send(msg)
    }
  }

async function inicialize(){
    await router.bind("tcp://*:3020")
    routeHandle()
    process.on("SIGINT", () => {
        joinRequest.send(["LBQExit",myDir]).then(process.exit())
    })
    console.log("LBQ inicialized")
}
joinRequest.connect(joinDir)
joinRequest.send(["LBQJoin", myDir])
joinRequest.receive().then(inicialize)

