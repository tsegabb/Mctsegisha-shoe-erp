/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './src/config/db.ts';
import apiRouter from './src/routes/index.ts';
import { errorHandlerMiddleware } from './src/middlewares/errorHandler.middleware.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Database (Postgres with auto-fallback to Local Memory Demo Mode)
try {
  await initializeDatabase();
} catch (err: any) {
  console.warn('⚠️ Non-fatal database initialization error:', err.message);
}

// SEO Endpoints (Robots & Sitemap)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# SoleFlow Shoe ERP Robots Configuration
User-agent: *
Allow: /
Allow: /login
Allow: /sitemap.xml
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

Sitemap: https://soleflow.app/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://soleflow.app/</loc>
    <lastmod>2026-08-12</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soleflow.app/login</loc>
    <lastmod>2026-08-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`);
});

// Mount centralized REST API routes
app.use('/api', apiRouter);

// Global express error handler middleware
app.use(errorHandlerMiddleware);

// Asset serving: Vite middleware for development, static file delivery for production
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, '../frontend'),
    configFile: path.join(__dirname, '../vite.config.ts'),
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shoes Stock Management Server is active on http://0.0.0.0:${PORT}`);
  console.log(`📡 Ingress routing listening to live connections in AI Studio preview iframe`);
});
