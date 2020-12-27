var zmq = require("zeromq")
sock = new zmq.Router
var id;
async function run(){
    while(true){
        const msg = await sock.receive()
        console.log("recibido")
        sock.send(msg)
    }
}
sock.bind("tcp://*:3020").then(() =>{
    console.log("acabado")
    run()
}).catch(console.log)