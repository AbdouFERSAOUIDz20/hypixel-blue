import { AxiosInstance } from 'axios';
export declare function getHypixelClient(): AxiosInstance;
export declare class UpstreamError extends Error {
    readonly statusCode: number;
    readonly body: Record<string, unknown>;
    constructor(message: string, statusCode: number, body: Record<string, unknown>);
}
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
export interface HypixelRequestOptions {
    path: string;
    params?: Record<string, string | undefined>;
}
export declare function fetchFromHypixel(opts: HypixelRequestOptions): Promise<unknown>;
//# sourceMappingURL=hypixel.d.ts.map