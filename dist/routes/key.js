"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyRoute = keyRoute;
const hypixel_1 = require("../services/hypixel");
const redis_1 = require("../cache/redis");
const response_1 = require("../utils/response");
const index_1 = require("../config/index");
async function keyRoute(app) {
    app.get('/v2/key', async (_request, reply) => {
        const cacheKey = (0, redis_1.buildCacheKey)('key', {});
        const start = Date.now();
        try {
            const cached = await (0, redis_1.cacheGet)(cacheKey);
            if (cached) {
                return (0, response_1.sendProxied)(reply, cached, {
                    cached: true,
                    latencyMs: Date.now() - start,
                    timestamp: new Date().toISOString(),
                });
            }
            const data = await (0, hypixel_1.fetchFromHypixel)({ path: '/v2/key' });
            await (0, redis_1.cacheSet)(cacheKey, data, index_1.config.cache.ttl.key);
            return (0, response_1.sendProxied)(reply, data, {
                cached: false,
                latencyMs: Date.now() - start,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            (0, response_1.handleProxyError)(reply, err);
        }
    });
}
//# sourceMappingURL=key.js.map