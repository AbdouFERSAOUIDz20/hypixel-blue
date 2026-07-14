import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/index';

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request) => {
      const cfIp = request.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string' && cfIp) return cfIp;
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
