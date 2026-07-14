import { Redis } from '@upstash/redis';
import { config } from '../config/index';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (client) return client;

  client = new Redis({
    url: config.redis.restUrl,
    token: config.redis.restToken,
  });

  return client;
}

export async function connectRedis(): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.ping();
    console.info('[Redis] Connected via Upstash REST');
  } catch (err) {
    console.warn('[Redis] Initial ping failed — will retry on first request:', (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  client = null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Non-fatal: cache miss will re-fetch from upstream
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.ping();
    return result === 'PONG';
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
