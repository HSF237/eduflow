const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadFile } = require('../services/storageService');
const { verifyToken } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max file size
});

/**
 * POST /api/storage/upload
 * Multi-part form upload replacement for Firebase Storage ref upload
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'uploads';
    const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const objectKey = `${folder}/${filename}`;

    const publicUrl = await uploadFile(req.file.buffer, objectKey, req.file.mimetype);

    res.json({
      message: 'File uploaded successfully to self-hosted MinIO storage',
      url: publicUrl,
      key: objectKey,
    });
  } catch (error) {
    console.error('Storage Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload file to MinIO storage' });
  }
});

module.exports = router;
