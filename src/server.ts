import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import Fastify, { type FastifyError } from 'fastify';
import compress from '@fastify/compress';
import { config } from './config/index';
import { connectRedis, disconnectRedis } from './cache/redis';
import { registerSecurity } from './middleware/security';
import { registerRateLimit } from './middleware/rateLimit';
import { registerRequestLogger } from './middleware/logger';
import { playerRoute } from './routes/player';
import { statusRoute } from './routes/status';
import { guildRoute } from './routes/guild';
import { recentGamesRoute } from './routes/recentgames';
import { keyRoute } from './routes/key';
import { healthRoute } from './routes/health';
import { statsRoute } from './routes/stats';

async function build(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: {
      level: config.log.level,
      ...(config.server.env === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    trustProxy: true,
    disableRequestLogging: true,
    requestTimeout: config.hypixel.timeoutMs + 2000,
    keepAliveTimeout: 5000,
    connectionTimeout: 10000,
  });

  // ── Compression ───────────────────────────────────────────────────────────────
  await app.register(compress, {
    global: true,
    encodings: ['gzip', 'deflate'],
    threshold: 1024,
  });

  // ── Security & CORS ───────────────────────────────────────────────────────────
  await registerSecurity(app);

  // ── Rate Limiting ─────────────────────────────────────────────────────────────
  await registerRateLimit(app);

  // ── Request Logging Hook ──────────────────────────────────────────────────────
  registerRequestLogger(app);

  // ── Routes ────────────────────────────────────────────────────────────────────
  await app.register(healthRoute);
  await app.register(playerRoute);
  await app.register(statusRoute);
  await app.register(guildRoute);
  await app.register(recentGamesRoute);
  await app.register(keyRoute);
  await app.register(statsRoute);

  // ── 404 Handler ───────────────────────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      cause: 'not_found',
      message: 'Endpoint not found. Valid endpoints: /v2/player, /v2/status, /v2/guild, /v2/recentgames, /v2/key, /health',
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error({ err: error }, 'Unhandled error');

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        cause: 'validation_error',
        message: error.message,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        cause: 'rate_limited',
        message: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      cause: 'internal_error',
      message: 'An unexpected error occurred.',
    });
  });

  return app;
}

async function start(): Promise<void> {
  let app: ReturnType<typeof Fastify> | undefined;

  try {
    await connectRedis();
    app = await build();
    await app.listen({ port: config.server.port, host: config.server.host });
    app.log.info(`Hypixel Proxy listening on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    if (app) {
      app.log.error({ err }, 'Failed to start server');
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    if (!app) return;
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start();
