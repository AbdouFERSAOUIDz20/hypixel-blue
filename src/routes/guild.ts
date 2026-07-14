import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { sendProxied, handleProxyError } from '../utils/response';
import { config } from '../config/index';

interface GuildQuery {
  id?: string;
  player?: string;
  name?: string;
}

export async function guildRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: GuildQuery }>(
    '/v2/guild',
    {
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
    },
    async (request: FastifyRequest<{ Querystring: GuildQuery }>, reply: FastifyReply) => {
      const { id, player, name } = request.query;

      if (!id && !player && !name) {
        return reply.status(400).send({
          success: false,
          cause: 'missing_parameter',
          message: 'Provide one of ?id=, ?player=, or ?name= query parameter.',
        });
      }

      const cacheKey = buildCacheKey('guild', { id, player, name });
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

        const data = await fetchFromHypixel({ path: '/v2/guild', params: { id, player, name } });
        await cacheSet(cacheKey, data, config.cache.ttl.guild);

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
