# StrangerConnect

A production-ready real-time random video chat application built with React Native Expo and NestJS.

## Architecture

```
StrangerConnect/
├── mobile/          # React Native Expo (TypeScript)
├── backend/         # NestJS API (TypeScript)
└── docs/            # API & deployment documentation
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React Native Expo, TypeScript, React Navigation, Zustand, TanStack Query, NativeWind, React Hook Form, Zod, Reanimated, WebRTC |
| Backend | NestJS, MongoDB, Redis, Socket.IO, JWT, WebRTC Signaling |
| Cloud | Firebase Push, Cloudinary, MongoDB Atlas |

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Android Studio (for Android emulator)
- Expo CLI

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm run start:dev
```

### Mobile

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL
npm start
# Press 'a' for Android emulator
```

### Android Emulator API URL

Use `http://10.0.2.2:3000` to reach localhost from Android emulator.

## Features

- **Authentication**: Email OTP, Google Login, Guest Login, JWT + Refresh Tokens
- **Video Chat**: WebRTC HD video, mute, camera toggle, flip camera
- **Matching**: Redis queue, country/interest preferences, priority premium matching
- **Text Chat**: Real-time messaging, typing indicators, emoji support
- **Safety**: Report, block, AI moderation hooks, screenshot detection
- **Premium**: Gender/country filters, unlimited matches, priority queue

## Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Environment Variables](docs/ENVIRONMENT.md)

## License

Proprietary - All rights reserved.
