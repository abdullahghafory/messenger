import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/direct', authenticateToken, (req, res) => {
  const { target_user_id } = req.body;
  const currentUserId = req.user.id;

  if (!target_user_id) {
    return res.status(400).json({ error: 'target_user_id is required' });
  }

  if (Number(target_user_id) === currentUserId) {
    return res.status(400).json({ error: 'Cannot create direct chat with yourself' });
  }

  const targetUser = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(target_user_id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  const existingChat = db.prepare(`
    SELECT c.id FROM chats c
    JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = ?
    JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = ?
    WHERE c.type = 'direct'
  `).get(currentUserId, target_user_id);

  if (existingChat) {
    return res.json({ chat_id: existingChat.id });
  }

  const transaction = db.transaction(() => {
    const chatResult = db.prepare(
      'INSERT INTO chats (type, created_by) VALUES (?, ?)'
    ).run('direct', currentUserId);

    const chatId = chatResult.lastInsertRowid;

    db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, currentUserId, 'owner');
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, target_user_id, 'member');

    return chatId;
  });

  const newChatId = transaction();
  res.status(201).json({ chat_id: newChatId });
});

router.post('/group', authenticateToken, (req, res) => {
  const { type, title, description, member_ids } = req.body;
  const currentUserId = req.user.id;

  if (!title || !type || !['group', 'channel'].includes(type)) {
    return res.status(400).json({ error: 'Valid title and type (group or channel) are required' });
  }

  const transaction = db.transaction(() => {
    const chatResult = db.prepare(
      'INSERT INTO chats (type, title, description, created_by) VALUES (?, ?, ?, ?)'
    ).run(type, title.trim(), (description || '').trim(), currentUserId);

    const chatId = chatResult.lastInsertRowid;

    db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, currentUserId, 'owner');

    if (Array.isArray(member_ids)) {
      const insertMember = db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)');
      for (const mId of member_ids) {
        if (mId !== currentUserId) {
          insertMember.run(chatId, mId, 'member');
        }
      }
    }

    return chatId;
  });

  const newChatId = transaction();
  res.status(201).json({ chat_id: newChatId });
});

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const chats = db.prepare(`
    SELECT
      c.id,
      c.type,
      c.title,
      c.description,
      c.avatar,
      c.created_by,
      c.created_at,
      (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT media_type FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_media_type,
      (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (
        SELECT JSON_GROUP_ARRAY(
          JSON_OBJECT('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar', u.avatar, 'is_online', u.is_online, 'last_seen', u.last_seen, 'role', cm2.role)
        )
        FROM chat_members cm2
        JOIN users u ON cm2.user_id = u.id
        WHERE cm2.chat_id = c.id
      ) as members
    FROM chats c
    JOIN chat_members cm ON c.id = cm.chat_id
    WHERE cm.user_id = ?
    ORDER BY COALESCE((SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1), c.created_at) DESC
  `).all(userId);

  const formattedChats = chats.map(chat => ({
    ...chat,
    members: JSON.parse(chat.members || '[]')
  }));

  res.json(formattedChats);
});

router.get('/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const member = db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
  if (!member) {
    return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });
  }

  const messages = db.prepare(`
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
      m.updated_at,
      (
        SELECT JSON_GROUP_ARRAY(
          JSON_OBJECT('emoji', mr.emoji, 'user_id', mr.user_id, 'display_name', ru.display_name)
        )
        FROM message_reactions mr
        JOIN users ru ON mr.user_id = ru.id
        WHERE mr.message_id = m.id
      ) as reactions
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `).all(chatId);

  const formatted = messages.map(msg => ({
    ...msg,
    reactions: JSON.parse(msg.reactions || '[]')
  }));

  res.json(formatted);
});

export default router;
