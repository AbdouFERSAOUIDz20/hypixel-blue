import Redis, { type RedisOptions } from 'ioredis';
import { config } from '../config/index';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (client) return client;

  const sharedOptions: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    tls: config.redis.tls ? {} : undefined,
    retryStrategy: (times: number) => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  };

  if (config.redis.url) {
    client = new Redis(config.redis.url, sharedOptions);
  } else {
    const redisConfig: RedisOptions = {
      ...sharedOptions,
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
    };
    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }
    client = new Redis(redisConfig);
  }

  client.on('connect', () => {
    console.info('[Redis] Connected');
  });

  client.on('error', (err: Error) => {
    console.error('[Redis] Error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.connect();
  } catch (err) {
    console.warn('[Redis] Initial connection failed — will retry in background:', (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Non-fatal: cache miss will just re-fetch from upstream
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export function buildCacheKey(endpoint: string, params: Record<string, string | undefined>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `hypixel:${endpoint}:${sorted}`;
}
