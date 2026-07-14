import Redis from 'ioredis';
export declare function getRedisClient(): Redis;
export declare function connectRedis(): Promise<void>;
export declare function disconnectRedis(): Promise<void>;
export declare function cacheGet<T>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void>;
export declare function isRedisHealthy(): Promise<boolean>;
export declare function buildCacheKey(endpoint: string, params: Record<string, string | undefined>): string;
//# sourceMappingURL=redis.d.ts.map