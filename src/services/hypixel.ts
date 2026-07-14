import http from 'http';
import https from 'https';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/index';

let _client: AxiosInstance | null = null;

export function getHypixelClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({
    baseURL: config.hypixel.baseUrl,
    timeout: config.hypixel.timeoutMs,
    headers: {
      'API-Key': config.hypixel.apiKey,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'User-Agent': 'HypixelProxy/1.0',
    },
    decompress: true,
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
  });

  _client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (err.response) {
        const upstreamError = new UpstreamError(
          `Hypixel API error: ${err.response.status}`,
          err.response.status,
          err.response.data as Record<string, unknown>,
        );
        return Promise.reject(upstreamError);
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        return Promise.reject(new TimeoutError('Upstream request timed out'));
      }
      return Promise.reject(err);
    },
  );

  return _client;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface HypixelRequestOptions {
  path: string;
  params?: Record<string, string | undefined>;
}

export async function fetchFromHypixel(opts: HypixelRequestOptions): Promise<unknown> {
  const client = getHypixelClient();

  const cleanParams: Record<string, string> = {};
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) cleanParams[k] = v;
    }
  }

  const response = await client.get(opts.path, {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
  });

  return response.data;
}
