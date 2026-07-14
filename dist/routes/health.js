"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoute = healthRoute;
const redis_1 = require("../cache/redis");
const startTime = Date.now();
async function healthRoute(app) {
    app.get('/health', {
        config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    }, async (_request, reply) => {
        const latencyStart = Date.now();
        const redisOk = await (0, redis_1.isRedisHealthy)();
        const latencyMs = Date.now() - latencyStart;
        const status = redisOk ? 'ok' : 'degraded';
        const httpStatus = redisOk ? 200 : 503;
        return reply.status(httpStatus).send({
            status,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            latency: latencyMs,
            redis: redisOk ? 'connected' : 'disconnected',
            cache: redisOk ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
        });
    });
}
//# sourceMappingURL=health.js.map