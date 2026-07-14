"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
function requireEnv(key) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value.trim();
}
function optionalEnv(key, fallback) {
    return (process.env[key] ?? fallback).trim();
}
exports.config = {
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
        url: optionalEnv('REDIS_URL', ''),
        host: optionalEnv('REDIS_HOST', '127.0.0.1'),
        port: parseInt(optionalEnv('REDIS_PORT', '6379'), 10),
        password: optionalEnv('REDIS_PASSWORD', ''),
        db: parseInt(optionalEnv('REDIS_DB', '0'), 10),
        tls: optionalEnv('REDIS_TLS', 'false') === 'true',
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
};
//# sourceMappingURL=index.js.map