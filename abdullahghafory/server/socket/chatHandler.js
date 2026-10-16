import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { JWT_SECRET } from '../middleware/auth.js';

export function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error: Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    db.prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(userId);
    io.emit('user_status_changed', { user_id: userId, is_online: 1, last_seen: new Date().toISOString() });

    socket.join(`user_${userId}`);

    const chats = db.prepare('SELECT chat_id FROM chat_members WHERE user_id = ?').all(userId);
    chats.forEach(chat => {
      socket.join(`chat_${chat.chat_id}`);
    });

    socket.on('send_message', (data, callback) => {
      try {
        const { chat_id, content, media_url, media_type, reply_to_id } = data;

        const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
        if (!member) {
          if (callback) callback({ error: 'Not a member of this chat' });
          return;
        }

        const stmt = db.prepare(`
          INSERT INTO messages (chat_id, sender_id, reply_to_id, content, media_url, media_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(chat_id, userId, reply_to_id || null, content || '', media_url || '', media_type || '');

        const messageId = result.lastInsertRowid;

        const message = db.prepare(`
          SELECT
            m.id,
            m.chat_id,
            m.sender_id,
            u.display_name as sender_name,
            u.avatar as sender_avatar,
            m.reply_to_id,
            (SELECT content FROM messages WHERE id = m.reply_to_id) as reply_content,
            (SELECT display_name FROM users WHERE id = (SELECT sender_id FROM messages WHERE id = m.reply_to_id)) as reply_sender_name,
            m.content,
            m.media_url,
            m.media_type,
            m.is_pinned,
            m.is_edited,
            m.created_at,
            m.updated_at
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `).get(messageId);

        message.reactions = [];

        io.to(`chat_${chat_id}`).emit('new_message', message);

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('send_message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ chat_id, is_typing } = {}) => {
      const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
      if (!member) return;
      socket.to(`chat_${chat_id}`).emit('user_typing', {
        chat_id,
        user_id: userId,
        display_name: socket.user.username,
        is_typing
      });
    });

    socket.on('toggle_pin_message', ({ message_id, chat_id } = {}, callback) => {
      try {
        const member = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
        if (!member) return callback?.({ error: 'Not a member of this chat' });
        const msg = db.prepare('SELECT is_pinned FROM messages WHERE id = ? AND chat_id = ?').get(message_id, chat_id);
        if (!msg) return;

        const newPinnedState = msg.is_pinned ? 0 : 1;
        db.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(newPinnedState, message_id);

        io.to(`chat_${chat_id}`).emit('message_pin_updated', { message_id, is_pinned: newPinnedState });
        if (callback) callback({ success: true, is_pinned: newPinnedState });
      } catch (err) {
        console.error('toggle_pin_message error:', err);
      }
    });

    socket.on('toggle_reaction', ({ message_id, chat_id, emoji } = {}) => {
      try {
        const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
        const messageExists = db.prepare('SELECT 1 FROM messages WHERE id = ? AND chat_id = ?').get(message_id, chat_id);
        if (!member || !messageExists || typeof emoji !== 'string' || emoji.length > 16) return;
        const existing = db.prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').get(message_id, userId, emoji);

        if (existing) {
          db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
        } else {
          db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(message_id, userId, emoji);
        }

        const reactions = db.prepare(`
          SELECT mr.emoji, mr.user_id, ru.display_name
          FROM message_reactions mr
          JOIN users ru ON mr.user_id = ru.id
          WHERE mr.message_id = ?
        `).all(message_id);

        io.to(`chat_${chat_id}`).emit('message_reactions_updated', { message_id, reactions });
      } catch (err) {
        console.error('toggle_reaction error:', err);
      }
    });

    socket.on('delete_message', ({ message_id, chat_id } = {}) => {
      try {
        const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
        if (!member) return;
        const msg = db.prepare('SELECT sender_id FROM messages WHERE id = ? AND chat_id = ?').get(message_id, chat_id);
        if (msg && msg.sender_id === userId) {
          db.prepare('DELETE FROM messages WHERE id = ?').run(message_id);
          io.to(`chat_${chat_id}`).emit('message_deleted', { message_id, chat_id });
        }
      } catch (err) {
        console.error('delete_message error:', err);
      }
    });

    socket.on('join_chat', ({ chat_id } = {}, callback) => {
      const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, userId);
      if (!member) return callback?.({ error: 'Not a member of this chat' });
      socket.join(`chat_${chat_id}`);
      callback?.({ success: true });
    });

    socket.on('disconnect', () => {
      const lastSeen = new Date().toISOString();
      if (io.sockets.adapter.rooms.get(`user_${userId}`)?.size > 0) return;
      db.prepare('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?').run(lastSeen, userId);
      io.emit('user_status_changed', { user_id: userId, is_online: 0, last_seen: lastSeen });
    });
  });
}
