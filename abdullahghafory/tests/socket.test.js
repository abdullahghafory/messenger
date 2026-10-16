import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { initDatabase, db } from '../server/db/database.js';
import authRoutes from '../server/routes/auth.js';
import chatsRoutes from '../server/routes/chats.js';
import { setupSocketHandlers } from '../server/socket/chatHandler.js';

test('Chats API and Socket.IO Integration Test', async (t) => {
  initDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/chats', chatsRoutes);

  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });
  setupSocketHandlers(ioServer);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let token1, token2, user1, user2, chatId;

  await t.test('Register 2 users and create direct chat', async () => {
    const res1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user1', display_name: 'User One', password: 'password' })
    });
    const d1 = await res1.json();
    token1 = d1.token;
    user1 = d1.user;

    const res2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user2', display_name: 'User Two', password: 'password' })
    });
    const d2 = await res2.json();
    token2 = d2.token;
    user2 = d2.user;

    const chatRes = await fetch(`${baseUrl}/api/chats/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify({ target_user_id: user2.id })
    });

    const chatData = await chatRes.json();
    assert.strictEqual(chatRes.status, 201);
    assert.ok(chatData.chat_id);
    chatId = chatData.chat_id;
  });

  await t.test('Socket.IO connect and send message in real-time', async () => {
    const client1 = Client(`http://localhost:${port}`, { auth: { token: token1 } });
    const client2 = Client(`http://localhost:${port}`, { auth: { token: token2 } });

    await new Promise((resolve) => client1.on('connect', resolve));
    await new Promise((resolve) => client2.on('connect', resolve));

    const messagePromise = new Promise((resolve) => {
      client2.on('new_message', (msg) => {
        resolve(msg);
      });
    });

    client1.emit('send_message', {
      chat_id: chatId,
      content: 'Hello via Socket.IO in LAN!'
    });

    const receivedMsg = await messagePromise;
    assert.strictEqual(receivedMsg.content, 'Hello via Socket.IO in LAN!');
    assert.strictEqual(receivedMsg.sender_id, user1.id);

    client1.disconnect();
    client2.disconnect();
  });

  server.close();
});
