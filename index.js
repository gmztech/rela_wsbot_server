'use strict';

const http = require('http');
const server = require('./server');
const mongoose = require('mongoose');

const { port } = require('./config').server;
const { uri } = require('./config').databaseConfig;

const { eventHandler } = require('./wsbot')

async function serverConnections() {
  await mongoose.connect(uri, { useNewUrlParser: true });
  return http.createServer(server.callback()).listen(port);
}

const bootsTrap = async _ => {
  try {
    const server = await serverConnections();
    console.log(`🚀 Server listening on port ${server.address().port}!`)
    const io = require('socket.io')(server, {cors: { origin : '*'} });
    return eventHandler(io)
  } catch (error) {
    setImmediate(() => {
      console.error('Unable to run the server because of the following error:');
      console.error(error);
      process.exit();
    });
  }

} 

bootsTrap()