# StrangerConnect API Documentation

Base URL: `http://localhost:3000/api/v1`

WebSocket Namespace: `ws://localhost:3000/chat`

## Authentication

All protected endpoints require `Authorization: Bearer <access_token>` header.

### Send OTP

```
POST /auth/otp/send
```

**Body:**
```json
{ "email": "user@example.com" }
```

**Response:** `200 OK`
```json
{ "message": "OTP sent successfully" }
```

### Verify OTP

```
POST /auth/otp/verify
```

**Body:**
```json
{ "email": "user@example.com", "code": "123456" }
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "uuid...",
  "expiresIn": "15m",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "user",
    "isGuest": false,
    "isPremium": false
  }
}
```

### Google Login

```
POST /auth/google
```

**Body:**
```json
{ "idToken": "google-id-token" }
```

### Guest Login

```
POST /auth/guest
```

**Body:**
```json
{ "username": "GuestUser" }
```

### Refresh Token

```
POST /auth/refresh
```

**Body:**
```json
{ "refreshToken": "uuid..." }
```

### Logout

```
POST /auth/logout
```

**Body:**
```json
{ "refreshToken": "uuid..." }
```

---

## Users

### Get Profile

```
GET /users/me
Authorization: Bearer <token>
```

### Update Profile

```
PATCH /users/me
Authorization: Bearer <token>
```

**Body:**
```json
{
  "username": "cooluser",
  "gender": "male",
  "age": 25,
  "country": "United States",
  "interests": ["Music", "Gaming"],
  "avatar": "data:image/jpeg;base64,..."
}
```

### Block User

```
POST /users/block
Authorization: Bearer <token>
```

**Body:**
```json
{ "userId": "user-id-to-block" }
```

### Update FCM Token

```
POST /users/fcm-token
Authorization: Bearer <token>
```

**Body:**
```json
{ "fcmToken": "firebase-token" }
```

---

## Stats

### Get App Stats

```
GET /stats
```

**Response:**
```json
{
  "onlineCount": 1234,
  "trendingCountries": [
    { "country": "United States", "count": 456 }
  ]
}
```

---

## Reports

### Create Report

```
POST /reports
Authorization: Bearer <token>
```

**Body:**
```json
{
  "reportedUserId": "user-id",
  "reason": "harassment",
  "description": "Optional details",
  "sessionId": "session-id"
}
```

**Reasons:** `inappropriate_content`, `harassment`, `spam`, `underage`, `other`

---

## WebSocket Events

Connect to `/chat` namespace with auth token:

```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'access-token' }
});
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_queue` | `{ country?, language?, gender?, interests? }` | Join matchmaking queue |
| `next_user` | — | Skip current match / leave queue |
| `send_message` | `{ sessionId, content }` | Send chat message |
| `typing` | `{ sessionId, isTyping }` | Typing indicator |
| `webrtc_offer` | `{ sessionId, offer }` | WebRTC SDP offer |
| `webrtc_answer` | `{ sessionId, answer }` | WebRTC SDP answer |
| `webrtc_ice_candidate` | `{ sessionId, candidate }` | ICE candidate |
| `report_user` | `{ reportedUserId, reason, sessionId? }` | Report user |
| `disconnect_user` | — | End call |
| `screenshot_detected` | `{ sessionId }` | Notify partner of screenshot |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `match_found` | `{ sessionId, partner }` | Match found |
| `searching` | `{ queueSize, onlineCount, estimatedWaitSeconds }` | Queue status |
| `receive_message` | `{ id, sessionId, senderId, content, timestamp }` | Incoming message |
| `typing` | `{ sessionId, isTyping }` | Partner typing |
| `disconnect_user` | `{ reason }` | Partner disconnected |
| `call_ended` | `{ reason }` | Call ended |
| `webrtc_offer` | `{ sessionId, offer }` | WebRTC offer relay |
| `webrtc_answer` | `{ sessionId, answer }` | WebRTC answer relay |
| `webrtc_ice_candidate` | `{ sessionId, candidate }` | ICE candidate relay |
| `screenshot_warning` | `{ message }` | Screenshot detected |
| `report_submitted` | `{ message, reportId }` | Report confirmation |

---

## Error Responses

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Error description",
  "timestamp": "2026-06-11T12:00:00.000Z",
  "path": "/api/v1/auth/otp/verify"
}
```

## Rate Limits

- OTP send: 3 requests per minute
- General API: 100 requests per minute
