"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRateLimit = registerRateLimit;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const redis_1 = require("../cache/redis");
const index_1 = require("../config/index");
async function registerRateLimit(app) {
    await app.register(rate_limit_1.default, {
        global: true,
        max: index_1.config.rateLimit.max,
        timeWindow: index_1.config.rateLimit.windowMs,
        redis: (0, redis_1.getRedisClient)(),
        keyGenerator: (request) => {
            const cfIp = request.headers['cf-connecting-ip'];
            if (typeof cfIp === 'string' && cfIp)
                return cfIp;
            return request.ip;
        },
        errorResponseBuilder: (_request, context) => ({
            success: false,
            cause: 'rate_limited',
            message: `Too many requests. Retry after ${context.after}.`,
            retryAfter: context.after,
        }),
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true,
        },
    });
}
//# sourceMappingURL=rateLimit.js.map