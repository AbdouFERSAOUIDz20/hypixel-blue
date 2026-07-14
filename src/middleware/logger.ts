import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const cacheHeader = reply.getHeader('X-Cache') as string | undefined;
    const latencyHeader = reply.getHeader('X-Latency-Ms') as string | undefined;

    request.log.info({
      ip: request.ip,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      latencyMs: latencyHeader ?? reply.elapsedTime.toFixed(2),
      cache: cacheHeader ?? 'N/A',
      timestamp: new Date().toISOString(),
    }, 'request completed');

    done();
  });
}
