"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRequestLogger = registerRequestLogger;
function registerRequestLogger(app) {
    app.addHook('onResponse', (request, reply, done) => {
        const cacheHeader = reply.getHeader('X-Cache');
        const latencyHeader = reply.getHeader('X-Latency-Ms');
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
//# sourceMappingURL=logger.js.map