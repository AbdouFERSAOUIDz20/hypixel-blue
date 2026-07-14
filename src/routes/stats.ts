import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { fetchFromHypixel } from '../services/hypixel';
import { cacheGet, cacheSet, buildCacheKey } from '../cache/redis';
import { handleProxyError } from '../utils/response';
import { config } from '../config/index';

interface StatsQuery {
  name?: string;
  uuid?: string;
}

interface MojangProfile {
  id: string;
  name: string;
}

async function resolveUuid(name: string): Promise<{ uuid: string; username: string }> {
  const cacheKey = `mojang:name:${name.toLowerCase()}`;
  const cached = await cacheGet<{ uuid: string; username: string }>(cacheKey);
  if (cached) return cached;

  const res = await axios.get<MojangProfile>(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
    { timeout: 5000 },
  );

  const result = {
    uuid: res.data.id,
    username: res.data.name,
  };

  await cacheSet(cacheKey, result, 300);
  return result;
}

function safe(n: unknown): number {
  return typeof n === 'number' ? n : 0;
}

function ratio(a: number, b: number): string {
  if (b === 0) return a > 0 ? '∞' : '0.00';
  return (a / b).toFixed(2);
}

function bedwarsLevel(xp: number): number {
  const levels = [500, 1000, 2000, 3500];
  let level = 0;
  let remaining = xp;
  while (remaining > 0) {
    const cost = level < 4 ? levels[level] : 5000;
    if (remaining >= cost) {
      remaining -= cost;
      level++;
    } else {
      break;
    }
  }
  return level;
}

function skyWarsLevel(xp: number): number {
  const xpTable = [0, 20, 70, 150, 250, 500, 1000, 2000, 3500, 6000, 10000, 15000];
  if (xp >= 15000) return Math.floor((xp - 15000) / 10000) + 12;
  for (let i = xpTable.length - 1; i >= 0; i--) {
    if (xp >= xpTable[i]) return i + 1;
  }
  return 1;
}

export async function statsRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: StatsQuery }>(
    '/v2/stats',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            uuid: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: StatsQuery }>, reply: FastifyReply) => {
      const { name, uuid: rawUuid } = request.query;

      if (!name && !rawUuid) {
        return reply.status(400).send({
          success: false,
          cause: 'missing_parameter',
          message: 'Provide either ?name= or ?uuid= query parameter.',
        });
      }

      const start = Date.now();

      try {
        let resolvedUuid: string;
        let resolvedName: string | undefined;

        if (name) {
          const mojang = await resolveUuid(name).catch(() => null);
          if (!mojang) {
            return reply.status(404).send({
              success: false,
              cause: 'player_not_found',
              message: `Player "${name}" was not found on Mojang.`,
            });
          }
          resolvedUuid = mojang.uuid;
          resolvedName = mojang.username;
        } else {
          resolvedUuid = rawUuid!;
        }

        const cacheKey = buildCacheKey('stats', { uuid: resolvedUuid });
        const cached = await cacheGet<unknown>(cacheKey);

        if (cached) {
          return reply
            .header('X-Cache', 'HIT')
            .header('X-Latency-Ms', String(Date.now() - start))
            .status(200)
            .send(cached);
        }

        const data = await fetchFromHypixel({ path: '/v2/player', params: { uuid: resolvedUuid } }) as {
          success: boolean;
          player: Record<string, unknown> | null;
        };

        if (!data.success || !data.player) {
          return reply.status(404).send({
            success: false,
            cause: 'player_not_found',
            message: 'Player not found on Hypixel.',
          });
        }

        const player = data.player as Record<string, unknown>;
        const stats = (player.stats ?? {}) as Record<string, Record<string, unknown>>;
        const bw = stats.Bedwars ?? {};
        const sw = stats.SkyWars ?? {};
        const duels = stats.Duels ?? {};

        const bwFk = safe(bw.final_kills_bedwars);
        const bwFd = safe(bw.final_deaths_bedwars);
        const bwW  = safe(bw.wins_bedwars);
        const bwL  = safe(bw.losses_bedwars);
        const bwBb = safe(bw.beds_broken_bedwars);
        const bwBl = safe(bw.beds_lost_bedwars);

        const swK  = safe(sw.kills);
        const swD  = safe(sw.deaths);
        const swW  = safe(sw.wins);
        const swL  = safe(sw.losses);

        const dW   = safe(duels.wins);
        const dL   = safe(duels.losses);
        const dK   = safe(duels.kills);
        const dD   = safe(duels.deaths);

        const result = {
          success: true,
          username: resolvedName ?? player.displayname ?? resolvedUuid,
          uuid: resolvedUuid,
          cached: false,

          bedwars: {
            level:        bedwarsLevel(safe(bw.Experience)),
            coins:        safe(bw.coins),
            winstreak:    safe(bw.winstreak),
            wins:         bwW,
            losses:       bwL,
            wlr:          ratio(bwW, bwL),
            finalKills:   bwFk,
            finalDeaths:  bwFd,
            fkdr:         ratio(bwFk, bwFd),
            bedsBroken:   bwBb,
            bedsLost:     bwBl,
            bblr:         ratio(bwBb, bwBl),
            kills:        safe(bw.kills_bedwars),
            deaths:       safe(bw.deaths_bedwars),
          },

          skywars: {
            level:     skyWarsLevel(safe(sw.skywars_experience)),
            coins:     safe(sw.coins),
            souls:     safe(sw.souls),
            heads:     safe(sw.heads),
            wins:      swW,
            losses:    swL,
            wlr:       ratio(swW, swL),
            kills:     swK,
            deaths:    swD,
            kdr:       ratio(swK, swD),
          },

          duels: {
            wins:             dW,
            losses:           dL,
            wlr:              ratio(dW, dL),
            kills:            dK,
            deaths:           dD,
            kdr:              ratio(dK, dD),
            currentWinstreak: safe(duels.current_winstreak),
            bestWinstreak:    safe(duels.best_overall_winstreak),
            coins:            safe(duels.coins),
          },

          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        await cacheSet(cacheKey, result, config.cache.ttl.player);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Latency-Ms', String(Date.now() - start))
          .status(200)
          .send(result);

      } catch (err) {
        handleProxyError(reply, err);
      }
    },
  );
}
