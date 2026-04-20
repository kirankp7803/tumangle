const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let activeUsers = 0;
let waitingQueue = [];

io.on('connection', (socket) => {
  activeUsers++;
  io.emit('stats_update', { activeUsers });
  console.log(`User Connected: ${socket.id}. Total active: ${activeUsers}`);

  socket.on('find_stranger', () => {
    // Prevent double queuing
    waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
    
    if (waitingQueue.length > 0) {
      const partner = waitingQueue.shift(); // FIFO
      const roomId = `room_${partner.id}_${socket.id}`;
      
      socket.join(roomId);
      partner.join(roomId);
      
      socket.roomId = roomId;
      partner.roomId = roomId;

      io.to(roomId).emit('stranger_matched', { roomId });
    } else {
      waitingQueue.push(socket);
      socket.emit('waiting_for_stranger');
    }
  });

  socket.on('send_message', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('receive_message', data);
    }
  });

  socket.on('end_call', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('stranger_disconnected');
      socket.leave(socket.roomId);
      // Let the partner know
      io.to(socket.roomId).in(socket.roomId).socketsLeave(socket.roomId);
      socket.roomId = null;
    }
    // Remove from queue if they end while waiting
    waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
  });

  socket.on('disconnect', () => {
    activeUsers--;
    io.emit('stats_update', { activeUsers });
    waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
    
    if (socket.roomId) {
      socket.to(socket.roomId).emit('stranger_disconnected');
    }
    console.log(`User Disconnected: ${socket.id}. Total active: ${activeUsers}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
