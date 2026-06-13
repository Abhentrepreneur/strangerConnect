# Production Best Practices

## Security

1. **Secrets Management** — Use AWS Secrets Manager, HashiCorp Vault, or platform env vars. Never hardcode secrets.
2. **JWT Rotation** — Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` quarterly. Implement token versioning for graceful rotation.
3. **Input Sanitization** — All user input is validated via `class-validator` (API) and `zod` (mobile). Chat messages are HTML-stripped server-side.
4. **Rate Limiting** — `@nestjs/throttler` limits OTP to 3/min and general API to 100/min. Tune per endpoint in production.
5. **CORS** — Restrict `CORS_ORIGINS` to your app domains only. Never use `*` in production.
6. **Helmet** — Security headers enabled via `helmet()` middleware.
7. **Socket Auth** — All WebSocket events require valid JWT via `WsJwtGuard`.

## Scalability

1. **Horizontal Scaling** — Run multiple API instances behind a load balancer with sticky sessions for Socket.IO.
2. **Redis Cluster** — Use Redis Cluster or Sentinel for matchmaking queue high availability.
3. **MongoDB** — Use MongoDB Atlas M10+ with replica sets. Index on `country`, `interests`, `email`.
4. **CDN** — Serve static assets and profile images via Cloudinary CDN.
5. **Connection Pooling** — Mongoose handles connection pooling. Set `maxPoolSize: 50` for production.

## WebRTC

1. **TURN Servers** — Deploy coturn for users behind symmetric NAT. STUN alone is insufficient for ~15% of connections.
2. **Adaptive Bitrate** — Monitor `connectionState` and degrade quality on poor networks.
3. **Signaling** — Socket.IO relays SDP/ICE. Keep signaling server close to users geographically.

## Monitoring & Observability

1. **Structured Logging** — Use Winston or Pino with JSON output in production.
2. **Health Checks** — Add `/health` endpoint for load balancer probes.
3. **Metrics** — Track: active WebSocket connections, queue depth, match rate, call duration, report rate.
4. **Alerting** — Alert on: error rate > 1%, queue wait > 60s, Redis/MongoDB connection failures.

## User Safety

1. **Report Pipeline** — Reports trigger moderation hooks. Integrate OpenAI Moderation API or AWS Comprehend.
2. **Block Lists** — Blocked users are excluded from matchmaking via Redis queue filtering.
3. **Screenshot Detection** — Mobile emits `screenshot_detected` event; partner receives warning.
4. **Age Gate** — Minimum age 18 enforced in profile schema and validation.
5. **Guest Limits** — Consider additional restrictions for guest accounts.

## Mobile

1. **Expo EAS** — Use EAS Build for reproducible production builds.
2. **OTA Updates** — Use `eas update` for JS-only fixes without store review.
3. **Secure Storage** — Tokens stored in `expo-secure-store`, not AsyncStorage.
4. **Permissions** — Request camera/mic only when starting a call.
5. **Offline Handling** — React Query retries and socket reconnection handle transient failures.

## Database

### Indexes
- `users.email` (unique)
- `users.country`
- `users.interests`
- `chat_messages.sessionId + createdAt`
- `refresh_tokens.token` (unique, TTL)
- `otps.expiresAt` (TTL)

### Backups
- MongoDB Atlas automated daily backups with 7-day retention minimum.
- Test restore procedure monthly.

## CI/CD Pipeline (Recommended)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm ci && npm run build && npm test
  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd mobile && npm ci && npx tsc --noEmit
```
