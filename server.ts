import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Parse raw binary bodies for large video uploads up to 150MB
  app.use(express.json({ limit: '100mb' }));
  app.use(express.raw({ type: ['video/*', 'application/octet-stream', 'application/x-binary'], limit: '150mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Showcase video upload endpoint with streaming Range support
  app.post('/api/showcase/upload-video', (req, res) => {
    try {
      const postId = (req.query.postId as string) || `sc_${Date.now()}`;
      const ext = (req.query.ext as string) || 'mp4';
      const fileName = `${postId}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        fs.writeFileSync(filePath, req.body);
        const videoUrl = `/uploads/videos/${fileName}`;
        console.log(`[Server Video Upload] Successfully saved video (${(req.body.length / (1024 * 1024)).toFixed(2)} MB) to ${filePath}`);
        return res.json({ success: true, videoUrl, size: req.body.length });
      }

      if (req.body && req.body.videoBase64) {
        const base64Data = req.body.videoBase64.replace(/^data:video\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        const videoUrl = `/uploads/videos/${fileName}`;
        console.log(`[Server Video Upload] Saved base64 video to ${filePath}`);
        return res.json({ success: true, videoUrl, size: buffer.length });
      }

      return res.status(400).json({ success: false, error: 'No video payload received in request.' });
    } catch (err: any) {
      console.error('[Server Video Upload Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Server upload failed' });
    }
  });

  // Static uploads directory serving
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
