"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildRoute = guildRoute;
const hypixel_1 = require("../services/hypixel");
const redis_1 = require("../cache/redis");
const response_1 = require("../utils/response");
const index_1 = require("../config/index");
async function guildRoute(app) {
    app.get('/v2/guild', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    id: { type: 'string', minLength: 1 },
                    player: { type: 'string', minLength: 1 },
                    name: { type: 'string', minLength: 1 },
                },
            },
        },
    }, async (request, reply) => {
        const { id, player, name } = request.query;
        if (!id && !player && !name) {
            return reply.status(400).send({
                success: false,
                cause: 'missing_parameter',
                message: 'Provide one of ?id=, ?player=, or ?name= query parameter.',
            });
        }
        const cacheKey = (0, redis_1.buildCacheKey)('guild', { id, player, name });
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
            const data = await (0, hypixel_1.fetchFromHypixel)({ path: '/v2/guild', params: { id, player, name } });
            await (0, redis_1.cacheSet)(cacheKey, data, index_1.config.cache.ttl.guild);
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
//# sourceMappingURL=guild.js.map