# Environment Variables

## Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Server port | `3000` |
| `API_PREFIX` | No | API route prefix | `api/v1` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `REDIS_HOST` | Yes | Redis hostname | `localhost` |
| `REDIS_PORT` | No | Redis port | `6379` |
| `REDIS_PASSWORD` | No | Redis password | `secret` |
| `JWT_SECRET` | Yes | JWT signing secret | `random-256-bit-string` |
| `JWT_EXPIRES_IN` | No | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret | `random-256-bit-string` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry | `7d` |
| `SMTP_HOST` | Yes* | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | No | SMTP port | `587` |
| `SMTP_USER` | Yes* | SMTP username | `email@gmail.com` |
| `SMTP_PASS` | Yes* | SMTP password | `app-password` |
| `SMTP_FROM` | No | From address | `StrangerConnect <noreply@...>` |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret | `GOCSPX-...` |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name | `mycloud` |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret | `abc123` |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID | `strangerconnect` |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase client email | `firebase-adminsdk@...` |
| `CORS_ORIGINS` | No | Allowed CORS origins | `https://app.example.com` |
| `THROTTLE_TTL` | No | Rate limit window (seconds) | `60` |
| `THROTTLE_LIMIT` | No | Max requests per window | `100` |

*SMTP required for email OTP. In development, OTP is logged to console if SMTP is not configured.

## Mobile (`mobile/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL | `http://10.0.2.2:3000/api/v1` |
| `EXPO_PUBLIC_SOCKET_URL` | Yes | WebSocket server URL | `http://10.0.2.2:3000` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth client ID | `xxx.apps.googleusercontent.com` |

### Platform-Specific URLs

| Platform | API URL |
|----------|---------|
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator | `http://localhost:3000` |
| Physical Device | `http://<your-local-ip>:3000` |
| Production | `https://api.strangerconnect.app` |

## Security Notes

1. **Never commit `.env` files** — they are in `.gitignore`
2. **Use strong secrets** — generate with `openssl rand -base64 64`
3. **Rotate JWT secrets** periodically in production
4. **Restrict CORS** to your app domains only
5. **Use MongoDB Atlas IP whitelist** in production
