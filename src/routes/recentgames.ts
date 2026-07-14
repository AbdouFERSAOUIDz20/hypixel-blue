import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { sendProxied, handleProxyError } from '../utils/response';
import { config } from '../config/index';

interface RecentGamesQuery {
  uuid: string;
}

export async function recentGamesRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: RecentGamesQuery }>(
    '/v2/recentgames',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['uuid'],
          properties: {
            uuid: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: RecentGamesQuery }>, reply: FastifyReply) => {
      const { uuid } = request.query;
      const cacheKey = buildCacheKey('recentgames', { uuid });
      const start = Date.now();

      try {
        const cached = await cacheGet(cacheKey);
        if (cached) {
          return sendProxied(reply, cached, {
            cached: true,
            latencyMs: Date.now() - start,
            timestamp: new Date().toISOString(),
          });
        }

        const data = await fetchFromHypixel({ path: '/v2/recentgames', params: { uuid } });
        await cacheSet(cacheKey, data, config.cache.ttl.recentgames);

        return sendProxied(reply, data, {
          cached: false,
          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        handleProxyError(reply, err);
      }
    },
  );
}
