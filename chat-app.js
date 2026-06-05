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
const server = http.createServer(app);const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.set('trust proxy', 1); // ✅ Fix: trust Railway's proxy for accurate IP detection
const server = http.createServer(app);
const io = new Server(server);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// Rate limiting — max 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter limit for login/register — max 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

app.use(express.static('public'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Config route
app.get('/config', (req, res) => {
  res.json({ groqKey: process.env.GROQ_API_KEY });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.log('❌ MongoDB error:', err));

// Socket.io — verify token on every connection
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

// Socket.io — Chat (NO messages stored in database)
io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected`);

  socket.on('chat message', (data) => {
    // Sanitize message — strip HTML tags
    const safeText = String(data.text).replace(/<[^>]*>/g, '').trim();
    if (!safeText || safeText.length > 1000) return;

    // Broadcast message — NOT saved to database
    io.emit('chat message', {
      text: safeText,
      username: socket.user.username // use server-side username, not client
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.username} disconnected`);
  });
});

// Start server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
const io = new Server(server);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// Rate limiting — max 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter limit for login/register — max 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

app.use(express.static('public'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Config route
app.get('/config', (req, res) => {
  res.json({ groqKey: process.env.GROQ_API_KEY });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.log('❌ MongoDB error:', err));

// Socket.io — verify token on every connection
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

// Socket.io — Chat (NO messages stored in database)
io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected`);

  socket.on('chat message', (data) => {
    // Sanitize message — strip HTML tags
    const safeText = String(data.text).replace(/<[^>]*>/g, '').trim();
    if (!safeText || safeText.length > 1000) return;

    // Broadcast message — NOT saved to database
    io.emit('chat message', {
      text: safeText,
      username: socket.user.username // use server-side username, not client
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.username} disconnected`);
  });
});

// Start server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});