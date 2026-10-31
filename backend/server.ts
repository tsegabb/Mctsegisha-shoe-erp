import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSchemaReady, closePool, pingDb } from './src/config/db.ts';
import { env, isProd } from './src/config/env.ts';
import { errorHandler } from './src/middlewares/errorHandler.middleware.ts';
import { apiLimiter } from './src/middlewares/rateLimit.middleware.ts';
import { requestContext } from './src/middlewares/requestContext.middleware.ts';
import apiRouter from './src/routes/index.ts';
import { logger } from './src/utils/logger.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct client IPs in rate limiting
app.disable('x-powered-by');
app.use(requestContext);
app.use(helmet({
  // Dev: Vite injects inline scripts for HMR, so CSP is off. Prod: strict defaults, but product/brand images are remote https URLs
  // and Tailwind/Vite emit inline styles. Add font hosts (e.g. https://fonts.googleapis.com / fonts.gstatic.com) if your index.html uses them.
  contentSecurityPolicy: isProd
    ? { directives: { 'img-src': ["'self'", 'data:', 'blob:', 'https:'], 'style-src': ["'self'", "'unsafe-inline'"] } }
    : false,
}));
const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : !isProd, credentials: false }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  const db = await pingDb();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded' }); // no internals leaked
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nAllow: /login\nDisallow: /api/\nDisallow: /admin/\nDisallow: /dashboard/\n`);
});

app.use('/api', apiLimiter, apiRouter);

// Frontend: Vite middleware in development, static build in production.
if (!isProd) {
  const { createServer } = await import('vite'); // dynamic: production images don't need vite installed
  const vite = await createServer({
    server: { middlewareMode: true }, appType: 'spa',
    root: path.join(__dirname, '../frontend'), configFile: path.join(__dirname, '../vite.config.ts'),
  });
  app.use(vite.middlewares);
} else {
  const dist = path.join(process.cwd(), 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

await assertSchemaReady().catch((err) => {
  logger.error(`Startup check failed: ${err.message}`);
  process.exit(1);
});

const server = app.listen(env.PORT, '0.0.0.0', () => logger.info(`API listening on :${env.PORT} (${env.NODE_ENV})`));

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => { await closePool(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));
