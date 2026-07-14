import type { FastifyInstance, FastifyReply } from 'fastify';
import { isRedisHealthy } from '../cache/redis';

const startTime = Date.now();

export async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (_request, reply: FastifyReply) => {
      const latencyStart = Date.now();
      const redisOk = await isRedisHealthy();
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
    },
  );
}
