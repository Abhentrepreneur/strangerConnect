# StrangerConnect Deployment Guide

## Production Architecture

```
                    ┌─────────────┐
                    │   Cloudflare │
                    │     CDN      │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │  Mobile App     │      │  Load Balancer  │
     │  (Expo EAS)     │      │  (Nginx/ALB)    │
     └─────────────────┘      └────────┬────────┘
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                   ┌────────▼────────┐   ┌────────▼────────┐
                   │  NestJS API     │   │  NestJS API     │
                   │  (Instance 1)   │   │  (Instance 2)   │
                   └────────┬────────┘   └────────┬────────┘
                            │                     │
                   ┌────────┴─────────────────────┴────────┐
                   │                                       │
          ┌────────▼────────┐                    ┌─────────▼────────┐
          │  MongoDB Atlas  │                    │  Redis Cluster   │
          └─────────────────┘                    └──────────────────┘
```

## Backend Deployment

### Option 1: Railway / Render

1. Connect GitHub repository
2. Set root directory to `backend`
3. Build command: `npm run build`
4. Start command: `npm run start:prod`
5. Add environment variables from `.env.example`

### Option 2: Docker

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

```bash
docker build -t strangerconnect-api ./backend
docker run -p 3000:3000 --env-file backend/.env strangerconnect-api
```

### Option 3: AWS ECS / Google Cloud Run

- Use the Docker image above
- Configure auto-scaling (min 2 instances for WebSocket sticky sessions)
- Enable sticky sessions on load balancer for Socket.IO

## Mobile Deployment (Android)

### EAS Build

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

### `eas.json`

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.strangerconnect.app/api/v1",
        "EXPO_PUBLIC_SOCKET_URL": "https://api.strangerconnect.app"
      }
    }
  }
}
```

### Google Play Store

1. Build AAB: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android`
3. Complete Play Console listing

## Infrastructure Setup

### MongoDB Atlas

1. Create M10+ cluster (production)
2. Enable IP whitelist / VPC peering
3. Create database user with readWrite role
4. Set `MONGODB_URI` in environment

### Redis

- **Production:** Redis Cloud or AWS ElastiCache
- **Required for:** Matchmaking queue, online presence, sessions

### Cloudinary

1. Create account at cloudinary.com
2. Copy cloud name, API key, API secret
3. Set environment variables

### Firebase (Push Notifications)

1. Create Firebase project
2. Add Android app with package `com.strangerconnect.app`
3. Download `google-services.json` to `mobile/android/app/`
4. Generate service account key for backend
5. Set `FIREBASE_*` environment variables

### SMTP (Email OTP)

- Use SendGrid, AWS SES, or Gmail App Password
- Configure `SMTP_*` variables

## SSL / HTTPS

Socket.IO and WebRTC require HTTPS in production.

```nginx
server {
    listen 443 ssl http2;
    server_name api.strangerconnect.app;

    ssl_certificate /etc/letsencrypt/live/api.strangerconnect.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.strangerconnect.app/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Production Checklist

- [ ] Change all JWT secrets
- [ ] Configure MongoDB Atlas with encryption at rest
- [ ] Set up Redis with password authentication
- [ ] Enable CORS with specific origins only
- [ ] Configure rate limiting
- [ ] Set up monitoring (Datadog, Sentry)
- [ ] Enable MongoDB backups
- [ ] Configure TURN servers for WebRTC (coturn)
- [ ] Set up CI/CD pipeline
- [ ] Enable HTTPS everywhere
- [ ] Review and test all safety features

## WebRTC TURN Server (Production)

For users behind strict NATs, deploy a TURN server:

```bash
# Install coturn
apt install coturn

# /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=strangerconnect.app
```

Add to mobile `ICE_SERVERS`:
```javascript
{
  urls: 'turn:turn.strangerconnect.app:3478',
  username: 'username',
  credential: 'password'
}
```

## Monitoring

Recommended stack:
- **APM:** Datadog or New Relic
- **Errors:** Sentry
- **Logs:** CloudWatch or Papertrail
- **Uptime:** UptimeRobot

Key metrics to monitor:
- WebSocket connection count
- Matchmaking queue size
- Average match wait time
- API response times
- WebRTC connection success rate
