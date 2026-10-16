import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/register', async (req, res) => {
  try {
    const { username, display_name, password } = req.body;

    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'Username, display name and password are required.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = db.prepare(
      'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
    ).run(trimmedUsername, display_name.trim(), passwordHash);

    const user = db.prepare('SELECT id, username, display_name, avatar, bio FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmedUsername);

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    const safeUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar: user.avatar,
      bio: user.bio,
      is_online: user.is_online,
      last_seen: user.last_seen
    };

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar, bio, is_online, last_seen FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

router.put('/profile', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    const { display_name, bio } = req.body;
    const userId = req.user.id;

    let avatarPath = undefined;
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    const newDisplayName = display_name !== undefined ? display_name.trim() : currentUser.display_name;
    const newBio = bio !== undefined ? bio.trim() : currentUser.bio;
    const newAvatar = avatarPath !== undefined ? avatarPath : currentUser.avatar;

    db.prepare('UPDATE users SET display_name = ?, bio = ?, avatar = ? WHERE id = ?').run(
      newDisplayName,
      newBio,
      newAvatar,
      userId
    );

    const updatedUser = db.prepare('SELECT id, username, display_name, avatar, bio FROM users WHERE id = ?').get(userId);
    res.json(updatedUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', authenticateToken, (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json([]);
  }

  const q = `%${query.trim()}%`;
  const users = db.prepare(
    'SELECT id, username, display_name, avatar, bio, is_online, last_seen FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND id != ? LIMIT 20'
  ).all(q, q, req.user.id);

  res.json(users);
});

export default router;
