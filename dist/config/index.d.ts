import 'dotenv/config';
export declare const config: {
    readonly server: {
        readonly port: number;
        readonly host: string;
        readonly env: string;
    };
    readonly hypixel: {
        readonly apiKey: string;
        readonly baseUrl: "https://api.hypixel.net";
        readonly timeoutMs: number;
    };
    readonly redis: {
        readonly url: string;
        readonly host: string;
        readonly port: number;
        readonly password: string;
        readonly db: number;
        readonly tls: boolean;
    };
    readonly cache: {
        readonly ttl: {
            readonly player: 30;
            readonly guild: 60;
            readonly status: 15;
            readonly recentgames: 15;
            readonly key: 60;
        };
    };
    readonly rateLimit: {
        readonly max: number;
        readonly windowMs: number;
    };
    readonly cors: {
        readonly origins: string;
    };
    readonly log: {
        readonly level: string;
    };
};
export type Config = typeof config;
//# sourceMappingURL=index.d.ts.map