const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get('/config', (req, res) => {
  res.json({ groqKey: process.env.GROQ_API_KEY });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.log('❌ MongoDB error:', err));

// Socket.io — Chat
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});