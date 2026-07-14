import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { sendProxied, handleProxyError } from '../utils/response';
import { config } from '../config/index';

interface PlayerQuery {
  uuid?: string;
  name?: string;
}

export async function playerRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PlayerQuery }>(
    '/v2/player',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            uuid: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: PlayerQuery }>, reply: FastifyReply) => {
      const { uuid, name } = request.query;

      if (!uuid && !name) {
        return reply.status(400).send({
          success: false,
          cause: 'missing_parameter',
          message: 'Provide either ?uuid= or ?name= query parameter.',
        });
      }

      const cacheKey = buildCacheKey('player', { uuid, name });
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

        const data = await fetchFromHypixel({ path: '/v2/player', params: { uuid, name } });
        await cacheSet(cacheKey, data, config.cache.ttl.player);

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
