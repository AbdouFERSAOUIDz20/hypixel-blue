import type { FastifyReply } from 'fastify';
export interface ProxyMeta {
    cached: boolean;
    latencyMs: number;
    timestamp: string;
}
export declare function sendProxied(reply: FastifyReply, data: unknown, meta: ProxyMeta): void;
export declare function handleProxyError(reply: FastifyReply, err: unknown): void;
//# sourceMappingURL=response.d.ts.map