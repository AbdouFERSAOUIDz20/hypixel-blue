import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return (process.env[key] ?? fallback).trim();
}

export const config = {
  server: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    env: optionalEnv('NODE_ENV', 'production'),
  },

  hypixel: {
    apiKey: requireEnv('HYPIXEL_API_KEY'),
    baseUrl: 'https://api.hypixel.net',
    timeoutMs: parseInt(optionalEnv('REQUEST_TIMEOUT_MS', '10000'), 10),
  },

  redis: {
    restUrl: requireEnv('UPSTASH_REDIS_REST_URL'),
    restToken: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
  },

  cache: {
    ttl: {
      player: 30,
      guild: 60,
      status: 15,
      recentgames: 15,
      key: 60,
    },
  },

  rateLimit: {
    max: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  cors: {
    origins: optionalEnv('CORS_ORIGINS', '*'),
  },

  log: {
    level: optionalEnv('LOG_LEVEL', 'info'),
  },
} as const;

export type Config = typeof config;
