"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecurity = registerSecurity;
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cors_1 = __importDefault(require("@fastify/cors"));
const index_1 = require("../config/index");
async function registerSecurity(app) {
    await app.register(helmet_1.default, {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    });
    const allowedOrigins = index_1.config.cors.origins === '*'
        ? true
        : index_1.config.cors.origins.split(',').map((o) => o.trim());
    await app.register(cors_1.default, {
        origin: allowedOrigins,
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
        maxAge: 86400,
    });
}
//# sourceMappingURL=security.js.map