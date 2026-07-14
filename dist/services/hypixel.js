"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.UpstreamError = void 0;
exports.getHypixelClient = getHypixelClient;
exports.fetchFromHypixel = fetchFromHypixel;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../config/index");
let _client = null;
function getHypixelClient() {
    if (_client)
        return _client;
    _client = axios_1.default.create({
        baseURL: index_1.config.hypixel.baseUrl,
        timeout: index_1.config.hypixel.timeoutMs,
        headers: {
            'API-Key': index_1.config.hypixel.apiKey,
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'User-Agent': 'HypixelProxy/1.0',
        },
        decompress: true,
        httpAgent: new http_1.default.Agent({ keepAlive: true, maxSockets: 50 }),
        httpsAgent: new https_1.default.Agent({ keepAlive: true, maxSockets: 50 }),
    });
    _client.interceptors.response.use((res) => res, (err) => {
        if (err.response) {
            const upstreamError = new UpstreamError(`Hypixel API error: ${err.response.status}`, err.response.status, err.response.data);
            return Promise.reject(upstreamError);
        }
        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            return Promise.reject(new TimeoutError('Upstream request timed out'));
        }
        return Promise.reject(err);
    });
    return _client;
}
class UpstreamError extends Error {
    statusCode;
    body;
    constructor(message, statusCode, body) {
        super(message);
        this.statusCode = statusCode;
        this.body = body;
        this.name = 'UpstreamError';
    }
}
exports.UpstreamError = UpstreamError;
class TimeoutError extends Error {
    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
async function fetchFromHypixel(opts) {
    const client = getHypixelClient();
    const cleanParams = {};
    if (opts.params) {
        for (const [k, v] of Object.entries(opts.params)) {
            if (v !== undefined)
                cleanParams[k] = v;
        }
    }
    const response = await client.get(opts.path, {
        params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    });
    return response.data;
}
//# sourceMappingURL=hypixel.js.map