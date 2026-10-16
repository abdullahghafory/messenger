import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDatabase, db } from '../server/db/database.js';
import authRoutes from '../server/routes/auth.js';
import networkRoutes from '../server/routes/network.js';

test('Authentication & Network Discovery API Test Suite', async (t) => {
  initDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/network', networkRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  await t.test('Register User', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ali_reza',
        display_name: 'Ali Reza',
        password: 'password123'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'ali_reza');
    assert.strictEqual(data.user.display_name, 'Ali Reza');
  });

  await t.test('Login User', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ali_reza',
        password: 'password123'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'ali_reza');
  });

  await t.test('Get Network Interfaces', async () => {
    const res = await fetch(`${baseUrl}/api/network/interfaces`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.addresses));
    assert.ok(data.hostname);
  });

  server.close();
});
