import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { sendProxied, handleProxyError } from '../utils/response';
import { config } from '../config/index';

interface StatusQuery {
  uuid: string;
}

export async function statusRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: StatusQuery }>(
    '/v2/status',
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
    async (request: FastifyRequest<{ Querystring: StatusQuery }>, reply: FastifyReply) => {
      const { uuid } = request.query;
      const cacheKey = buildCacheKey('status', { uuid });
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

        const data = await fetchFromHypixel({ path: '/v2/status', params: { uuid } });
        await cacheSet(cacheKey, data, config.cache.ttl.status);

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
