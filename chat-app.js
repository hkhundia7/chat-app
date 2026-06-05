const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

app.use(express.static('public'));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get('/config', (req, res) => {
  res.json({ groqKey: process.env.GROQ_API_KEY });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.log('❌ MongoDB error:', err));

// Track online users
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const username = socket.user.username;
  onlineUsers.set(socket.id, username);
  
  // Broadcast online users
  io.emit('online users', Array.from(onlineUsers.values()));
  console.log(`✅ ${username} connected`);

  // Group message
  socket.on('chat message', (data) => {
    const safeText = String(data.text).replace(/<[^>]*>/g, '').trim();
    if (!safeText || safeText.length > 1000) return;
    io.emit('chat message', {
      id: Date.now(),
      text: safeText,
      username: socket.user.username,
      reactions: {}
    });
  });

  // Private message
  socket.on('private message', ({ to, text }) => {
    const safeText = String(text).replace(/<[^>]*>/g, '').trim();
    if (!safeText || safeText.length > 1000) return;
    
    // Find receiver's socket
    for (const [id, name] of onlineUsers.entries()) {
      if (name === to) {
        const msg = {
          id: Date.now(),
          text: safeText,
          username: socket.user.username,
          isPrivate: true,
          reactions: {}
        };
        io.to(id).emit('private message', msg);
        socket.emit('private message', msg);
        break;
      }
    }
  });

  // Emoji reaction
  socket.on('reaction', ({ messageId, emoji }) => {
    io.emit('reaction', { messageId, emoji, username: socket.user.username });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online users', Array.from(onlineUsers.values()));
    console.log(`❌ ${username} disconnected`);
  });
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});