# Hypixel API Proxy

Production-ready reverse proxy for the Hypixel API, built for the **Seraph** client.

**Base URL:** `https://hypixel.blue-link.net/v2`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (LTS) |
| Framework | Fastify 5 |
| Language | TypeScript |
| Cache | Redis 7 (ioredis) |
| HTTP Client | Axios + Keep-Alive |
| Compression | gzip via @fastify/compress |
| Security | Helmet, CORS, Rate-Limiting |
| Logging | Pino (structured JSON) |
| Process Manager | PM2 Cluster |
| Reverse Proxy | Nginx + HTTP/2 + TLS |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Endpoints

| Method | Path | Cache TTL | Description |
|--------|------|-----------|-------------|
| GET | `/v2/player` | 30 s | Player stats (BedWars, SkyWars, Duels) |
| GET | `/v2/status` | 15 s | Online status |
| GET | `/v2/guild` | 60 s | Guild info |
| GET | `/v2/recentgames` | 15 s | Recent games |
| GET | `/v2/key` | 60 s | Key metadata |
| GET | `/health` | — | Health check |

### Query Parameters

```
GET /v2/player?uuid=<uuid>
GET /v2/player?name=<ign>
GET /v2/status?uuid=<uuid>
GET /v2/guild?id=<guild_id>
GET /v2/guild?player=<uuid>
GET /v2/guild?name=<guild_name>
GET /v2/recentgames?uuid=<uuid>
GET /v2/key
```

### Health Response

```json
{
  "status": "ok",
  "uptime": 3600,
  "latency": 1,
  "redis": "connected",
  "cache": "healthy",
  "timestamp": "2026-07-14T12:00:00.000Z"
}
```

### Response Headers

| Header | Meaning |
|--------|---------|
| `X-Cache` | `HIT` or `MISS` |
| `X-Latency-Ms` | Upstream round-trip in ms |
| `X-RateLimit-Remaining` | Remaining requests in window |

---

## Quick Start (Docker Compose)

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USER/hypixel-proxy.git
cd hypixel-proxy

cp .env.example .env
# Edit .env and set HYPIXEL_API_KEY=your_real_key
nano .env
```

### 2. SSL Certificates

**Option A – Let's Encrypt (certbot, recommended)**

```bash
# Install certbot on the host
sudo apt install certbot -y

# Issue cert (DNS challenge works behind Cloudflare)
sudo certbot certonly --standalone \
  -d hypixel.blue-link.net \
  --email your@email.com \
  --agree-tos

# Copy certs to ./ssl
mkdir -p ssl
sudo cp /etc/letsencrypt/live/hypixel.blue-link.net/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/hypixel.blue-link.net/privkey.pem   ssl/
sudo chown $USER:$USER ssl/*.pem
```

**Option B – Cloudflare Origin Certificate**

1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Paste the certificate into `ssl/fullchain.pem`
3. Paste the private key into `ssl/privkey.pem`
4. Set SSL/TLS mode to **Full (strict)**

### 3. Start everything

```bash
docker compose up -d
```

### 4. Verify

```bash
curl https://hypixel.blue-link.net/health
curl "https://hypixel.blue-link.net/v2/player?uuid=YOUR_UUID"
```

---

## Seraph Client Configuration

| Setting | Value |
|---------|-------|
| Custom Hypixel API Proxy | `https://hypixel.blue-link.net/v2` |
| Use Seraph Proxy | Disabled |
| API Key | *(leave empty — the proxy handles it)* |

---

## PM2 (non-Docker alternative)

```bash
# Build
npm ci && npm run build

# Create logs directory
mkdir -p logs

# Start with PM2 cluster mode
npm install -g pm2
pm2 start ecosystem.config.js

# Save process list for server reboot
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HYPIXEL_API_KEY` | **required** | Your Hypixel API key |
| `PORT` | `3000` | Server listen port |
| `HOST` | `0.0.0.0` | Server listen host |
| `NODE_ENV` | `production` | Node environment |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `REDIS_DB` | `0` | Redis DB index |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `REQUEST_TIMEOUT_MS` | `10000` | Upstream timeout in ms |
| `LOG_LEVEL` | `info` | Pino log level |

---

## Cloudflare Setup

1. Add `hypixel.blue-link.net` as an A record pointing to your server IP
2. **Proxy status:** Proxied (orange cloud)
3. **SSL/TLS → Mode:** Full (strict)
4. **Edge Certificates:** Enable "Always Use HTTPS"
5. **Speed → Optimization:** Enable HTTP/2 and HTTP/3
6. **Security → WAF:** Optional — the proxy has its own rate limiting

> The proxy reads `CF-Connecting-IP` automatically for accurate IP-based rate limiting.

---

## GitHub Actions Secrets

Add these to your repository's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | VPS/server IP or hostname |
| `DEPLOY_USER` | SSH username (e.g. `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key for the deploy user |
| `DEPLOY_PORT` | SSH port (default: `22`) |

---

## Certificate Auto-Renewal

```bash
# Add to crontab (runs twice daily)
0 0,12 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/hypixel.blue-link.net/fullchain.pem /opt/hypixel-proxy/ssl/ && \
  cp /etc/letsencrypt/live/hypixel.blue-link.net/privkey.pem   /opt/hypixel-proxy/ssl/ && \
  docker compose -f /opt/hypixel-proxy/docker-compose.yml exec nginx nginx -s reload
```

---

## Security Notes

- The `HYPIXEL_API_KEY` is **never** returned in any API response
- All upstream requests use the `API-Key` header — the key is injected server-side
- Helmet adds security headers; CSP is off because this is a pure JSON API
- Rate limiting is backed by Redis for accuracy across PM2 cluster workers
- Nginx enforces an additional rate limit as a second layer of defense
