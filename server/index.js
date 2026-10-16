import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import networkRoutes from './routes/network.js';
import chatsRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import { setupSocketHandlers } from './socket/chatHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/upload', uploadRoutes);

setupSocketHandlers(io);

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Telegram LAN Messenger API Server is running.');
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Telegram LAN Messenger server listening on http://${HOST}:${PORT}`);
});

export { app, server, io };
