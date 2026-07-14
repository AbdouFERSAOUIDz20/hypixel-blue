"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendProxied = sendProxied;
exports.handleProxyError = handleProxyError;
const hypixel_1 = require("../services/hypixel");
function sendProxied(reply, data, meta) {
    reply
        .header('X-Cache', meta.cached ? 'HIT' : 'MISS')
        .header('X-Latency-Ms', String(meta.latencyMs))
        .header('X-Timestamp', meta.timestamp)
        .status(200)
        .send(data);
}
function handleProxyError(reply, err) {
    if (err instanceof hypixel_1.UpstreamError) {
        reply.status(err.statusCode).send({
            success: false,
            cause: 'upstream_error',
            message: err.message,
            upstream: err.body,
        });
        return;
    }
    if (err instanceof hypixel_1.TimeoutError) {
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
//# sourceMappingURL=response.js.map