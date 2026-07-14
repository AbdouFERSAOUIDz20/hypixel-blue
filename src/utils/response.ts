import type { FastifyReply } from 'fastify';
import { UpstreamError, TimeoutError } from '../services/hypixel';

export interface ProxyMeta {
  cached: boolean;
  latencyMs: number;
  timestamp: string;
}

export function sendProxied(
  reply: FastifyReply,
  data: unknown,
  meta: ProxyMeta,
): void {
  reply
    .header('X-Cache', meta.cached ? 'HIT' : 'MISS')
    .header('X-Latency-Ms', String(meta.latencyMs))
    .header('X-Timestamp', meta.timestamp)
    .status(200)
    .send(data);
}

export function handleProxyError(reply: FastifyReply, err: unknown): void {
  if (err instanceof UpstreamError) {
    reply.status(err.statusCode).send({
      success: false,
      cause: 'upstream_error',
      message: err.message,
      upstream: err.body,
    });
    return;
  }

  if (err instanceof TimeoutError) {
    reply.status(504).send({
      success: false,
      cause: 'timeout',
      message: 'The upstream Hypixel API did not respond in time.',
    });
    return;
  }

  reply.status(500).send({
    success: false,
    cause: 'internal_error',
    message: 'An unexpected error occurred.',
  });
}
