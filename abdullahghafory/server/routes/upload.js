import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/attachments';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/attachment', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const mime = req.file.mimetype;
  let mediaType = 'document';

  if (mime.startsWith('image/')) mediaType = 'image';
  else if (mime.startsWith('video/')) mediaType = 'video';
  else if (mime.startsWith('audio/')) mediaType = req.file.originalname.includes('voice') ? 'voice' : 'audio';

  const fileUrl = `/uploads/attachments/${req.file.filename}`;

  res.json({
    url: fileUrl,
    media_type: mediaType,
    original_name: req.file.originalname,
    size: req.file.size
  });
});

export default router;
