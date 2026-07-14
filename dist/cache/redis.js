"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.isRedisHealthy = isRedisHealthy;
exports.buildCacheKey = buildCacheKey;
const ioredis_1 = __importDefault(require("ioredis"));
const index_1 = require("../config/index");
let client = null;
function getRedisClient() {
    if (client)
        return client;
    const sharedOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        tls: index_1.config.redis.tls ? {} : undefined,
        retryStrategy: (times) => {
            if (times > 5)
                return null;
            return Math.min(times * 200, 2000);
        },
        reconnectOnError: (err) => {
            const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
            return targetErrors.some((e) => err.message.includes(e));
        },
    };
    if (index_1.config.redis.url) {
        client = new ioredis_1.default(index_1.config.redis.url, sharedOptions);
    }
    else {
        const redisConfig = {
            ...sharedOptions,
            host: index_1.config.redis.host,
            port: index_1.config.redis.port,
            db: index_1.config.redis.db,
        };
        if (index_1.config.redis.password) {
            redisConfig.password = index_1.config.redis.password;
        }
        client = new ioredis_1.default(redisConfig);
    }
    client.on('connect', () => {
        console.info('[Redis] Connected');
    });
    client.on('error', (err) => {
        console.error('[Redis] Error:', err.message);
    });
    client.on('close', () => {
        console.warn('[Redis] Connection closed');
    });
    return client;
}
async function connectRedis() {
    const redis = getRedisClient();
    await redis.connect();
}
async function disconnectRedis() {
    if (client) {
        await client.quit();
        client = null;
    }
}
async function cacheGet(key) {
    try {
        const redis = getRedisClient();
        const raw = await redis.get(key);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds) {
    try {
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }
    catch {
    }
}
async function isRedisHealthy() {
    try {
        const redis = getRedisClient();
        const pong = await redis.ping();
        return pong === 'PONG';
    }
    catch {
        return false;
    }
}
function buildCacheKey(endpoint, params) {
    const sorted = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    return `hypixel:${endpoint}:${sorted}`;
}
//# sourceMappingURL=redis.js.map