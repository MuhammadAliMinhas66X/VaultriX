import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { isImageStorageReady } from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

fs.mkdirSync(AVATAR_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.has(file.mimetype)) {
    cb(new Error('Please upload a JPG, PNG or WEBP image.'));
    return;
  }
  cb(null, true);
};

const limits = { fileSize: 3 * 1024 * 1024, files: 1 };

const diskUploader = multer({ storage: diskStorage, fileFilter, limits });
const memoryUploader = multer({ storage: multer.memoryStorage(), fileFilter, limits });

const run = (uploader, field) => (req, res, next) => {
  uploader.single(field)(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'That image is too large. Please choose one under 3MB.' });
    }

    res.status(400).json({ success: false, message: error.message || 'Could not upload that image.' });
  });
};

export const uploadAvatar = (req, res, next) => run(isImageStorageReady() ? memoryUploader : diskUploader, 'avatar')(req, res, next);

export const uploadProofImage = run(memoryUploader, 'image');
