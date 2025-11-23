# Cloudflare Image Proxy Worker

A lightweight image proxy service deployed on Cloudflare Workers.

## Features

- Image proxying with caching
- Referer validation
- Rate limiting
- User-agent filtering
- Custom domain support

## Quick Start

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create KV Namespace

```bash
cd cloudflare-proxy-worker
wrangler kv:namespace create "RATE_LIMIT_KV"
```

Update `wrangler.toml` with the namespace ID.

### 3. Deploy

```bash
npm install
npm run deploy
```

### 4. Configure Frontend

Update environment variables:

```env
NEXT_PUBLIC_PROXY_URL=https://your-worker.workers.dev/image
```

## Configuration

Edit `src/index.ts` to customize:
- Rate limiting rules
- Allowed referers
- Cache policies

## Development

```bash
npm run dev  # Local testing on localhost:8787
```

## Monitoring

View metrics in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Metrics

## Security

- Referer whitelist
- User-agent blacklist
- IP-based rate limiting
- Protocol restrictions
- CORS headers

## Documentation

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
