import type { FastifyInstance, FastifyReply } from 'fastify';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { sendProxied, handleProxyError } from '../utils/response';
import { config } from '../config/index';

export async function keyRoute(app: FastifyInstance): Promise<void> {
  app.get('/v2/key', async (_request, reply: FastifyReply) => {
    const cacheKey = buildCacheKey('key', {});
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

      const data = await fetchFromHypixel({ path: '/v2/key' });
      await cacheSet(cacheKey, data, config.cache.ttl.key);

      return sendProxied(reply, data, {
        cached: false,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      handleProxyError(reply, err);
    }
  });
}
