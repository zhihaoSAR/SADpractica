const express = require('express');

var zmq = require("zeromq"),
  frontends = zmq.socket("push");



  const handler = (req, res) => {
    // Pipe the vanilla node HTTP request (a readable stream) into `request`
    // to the next server URL. Then, since `res` implements the writable stream
    // interface, you can just `pipe()` into `res`.
    frontends.send(req)
    res.end("Hello");
  };
  const server = express().get('*', handler).post('*', handler);
  
  server.listen(8080);

frontends.bind("tcp://127.0.0.1:3000");
console.log("Producer bound to port 3000");

