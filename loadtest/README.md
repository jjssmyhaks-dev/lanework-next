# Lanework Load Testing

## Prerequisites
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed
- OR Docker installed (for containerized runs)

## Quick Start

### With k6 installed locally:
```bash
# Test auth flow (100 concurrent users)
k6 run loadtest/k6-login.js

# Test chat API (50 concurrent users)
k6 run loadtest/k6-chat.js

# Test all CRUD endpoints (200 concurrent users)
k6 run loadtest/k6-api.js

# Stress test (find breaking point)
k6 run loadtest/k6-stress.js
```

### With Docker:
```bash
cd loadtest
docker-compose up k6
```

## Configuration

Set environment variables:
```bash
export BASE_URL=https://your-app.vercel.app
export AUTH_TOKEN=your-jwt-token-here
```

For real testing, get a valid auth token:
```bash
# Login and extract token
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}'

# Copy the auth-token cookie value
```

## Test Scenarios

| Test | VUs | Duration | Target |
|------|-----|----------|--------|
| k6-login.js | 10-100 | 6 min | Auth endpoints |
| k6-chat.js | 10-50 | 6 min | Chat API |
| k6-api.js | 20-200 | 8 min | All CRUD |
| k6-stress.js | 10-500 | 10 min | Breaking point |

## Performance Targets

| Metric | Target |
|--------|--------|
| Login p95 latency | < 500ms |
| Chat p95 latency | < 3s |
| API CRUD p95 latency | < 200ms |
| Health check p95 | < 100ms |
| Error rate | < 5% |
| Concurrent users supported | 10,000+ |

## Monitoring

k6 outputs metrics to stdout. For dashboards:
```bash
# With Grafana stack
docker-compose up

# Access Grafana at http://localhost:3001
# Import k6 dashboard: ID 2044
```

## Architecture Notes

Lanework's scalability comes from:
- **Neon PostgreSQL**: Serverless, auto-scales connections
- **Vercel Edge Functions**: Global CDN, automatic scaling
- **In-memory caching**: 30s TTL for dashboard, 15s for usage
- **JWT auth**: Stateless, no session DB hits
- **Connection pooling**: Neon pooler handles 10,000+ concurrent connections
