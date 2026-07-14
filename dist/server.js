"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const compress_1 = __importDefault(require("@fastify/compress"));
const index_1 = require("./config/index");
const redis_1 = require("./cache/redis");
const security_1 = require("./middleware/security");
const rateLimit_1 = require("./middleware/rateLimit");
const logger_1 = require("./middleware/logger");
const player_1 = require("./routes/player");
const status_1 = require("./routes/status");
const guild_1 = require("./routes/guild");
const recentgames_1 = require("./routes/recentgames");
const key_1 = require("./routes/key");
const health_1 = require("./routes/health");
async function build() {
    const app = (0, fastify_1.default)({
        logger: {
            level: index_1.config.log.level,
            ...(index_1.config.server.env === 'development'
                ? {
                    transport: {
                        target: 'pino-pretty',
                        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
                    },
                }
                : {}),
        },
        trustProxy: true,
        disableRequestLogging: true,
        requestTimeout: index_1.config.hypixel.timeoutMs + 2000,
        keepAliveTimeout: 5000,
        connectionTimeout: 10000,
    });
    await app.register(compress_1.default, {
        global: true,
        encodings: ['gzip', 'deflate'],
        threshold: 1024,
    });
    await (0, security_1.registerSecurity)(app);
    await (0, rateLimit_1.registerRateLimit)(app);
    (0, logger_1.registerRequestLogger)(app);
    await app.register(health_1.healthRoute);
    await app.register(player_1.playerRoute);
    await app.register(status_1.statusRoute);
    await app.register(guild_1.guildRoute);
    await app.register(recentgames_1.recentGamesRoute);
    await app.register(key_1.keyRoute);
    app.setNotFoundHandler((_request, reply) => {
        reply.status(404).send({
            success: false,
            cause: 'not_found',
            message: 'Endpoint not found. Valid endpoints: /v2/player, /v2/status, /v2/guild, /v2/recentgames, /v2/key, /health',
        });
    });
    app.setErrorHandler((error, _request, reply) => {
        app.log.error({ err: error }, 'Unhandled error');
        if (error.validation) {
            return reply.status(400).send({
                success: false,
                cause: 'validation_error',
                message: error.message,
            });
        }
        if (error.statusCode === 429) {
            return reply.status(429).send({
                success: false,
                cause: 'rate_limited',
                message: error.message,
            });
        }
        return reply.status(500).send({
            success: false,
            cause: 'internal_error',
            message: 'An unexpected error occurred.',
        });
    });
    return app;
}
async function start() {
    let app;
    try {
        await (0, redis_1.connectRedis)();
        app = await build();
        await app.listen({ port: index_1.config.server.port, host: index_1.config.server.host });
        app.log.info(`Hypixel Proxy listening on ${index_1.config.server.host}:${index_1.config.server.port}`);
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
    const shutdown = async (signal) => {
        if (!app)
            return;
        app.log.info(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        await (0, redis_1.disconnectRedis)();
        process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
void start();
//# sourceMappingURL=server.js.map