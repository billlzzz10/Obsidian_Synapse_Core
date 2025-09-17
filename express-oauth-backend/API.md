# Blink Note Backend API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Get ClickUp OAuth URL
```http
GET /auth/clickup/authorize
```

**Response:**
```json
{
  "authUrl": "https://app.clickup.com/api?client_id=...&redirect_uri=...&state=..."
}
```

#### ClickUp OAuth Callback
```http
GET /auth/clickup/callback?code=...&state=...
```

**Response:** Redirects to frontend with token or error

#### Get User's OAuth Tokens
```http
GET /auth/tokens
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "tokens": [
    {
      "provider": "clickup",
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### Revoke OAuth Token
```http
DELETE /auth/tokens/:provider
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Token revoked successfully"
}
```

---

### AI Service Endpoints

#### List Available Providers
```http
GET /api/ai/providers
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "providers": ["openai", "anthropic", "google", "huggingface", "xai", "openrouter"]
}
```

#### List Available Models
```http
GET /api/ai/models?provider=openai
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `provider` (optional): Specific provider to get models from

**Response:**
```json
{
  "models": {
    "openai": ["gpt-3.5-turbo", "gpt-4", "gpt-4-32k"],
    "anthropic": ["claude-3-opus-20240229", "claude-3-sonnet-20240229"]
  }
}
```

#### Chat Completion
```http
POST /api/ai/chat
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "options": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9
  }
}
```

**Response:**
```json
{
  "content": "Hello! I'm doing well, thank you for asking. How can I help you today?",
  "usage": {
    "promptTokens": 20,
    "completionTokens": 15,
    "totalTokens": 35
  },
  "cost": 0.00007,
  "requestId": "request-id"
}
```

#### Stream Chat Completion
```http
POST /api/ai/chat/stream
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as chat completion

**Response:** Server-Sent Events (SSE) stream
```
data: {"content": "Hello"}
data: {"content": "! I'm"}
data: {"content": " doing well"}
data: {"done": true, "usage": {...}, "cost": 0.00007}
```

#### Get AI Request History
```http
GET /api/ai/history?limit=50&offset=0&provider=openai&status=completed
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (default: 50): Number of records to return
- `offset` (default: 0): Number of records to skip
- `provider` (optional): Filter by provider
- `status` (optional): Filter by status (pending, completed, failed)

**Response:**
```json
{
  "requests": [
    {
      "id": "request-id",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "status": "completed",
      "tokens": 35,
      "cost": 0.00007,
      "createdAt": "2024-01-01T00:00:00Z",
      "prompt": [{"role": "user", "content": "Hello"}],
      "response": "Hello! How can I help you?"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### Get AI Usage Statistics
```http
GET /api/ai/stats?period=7d
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period`: Time period (24h, 7d, 30d, all)

**Response:**
```json
{
  "period": "7d",
  "stats": [...],
  "costByProvider": [
    {
      "provider": "openai",
      "totalCost": 12.50
    }
  ],
  "totalRequests": 150,
  "totalTokens": 50000,
  "totalCost": 15.75
}
```

---

### Sentry Integration Endpoints

#### Capture Event
```http
POST /api/sentry/capture
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "level": "error",
  "message": "An error occurred",
  "exception": {
    "type": "TypeError",
    "value": "Cannot read property 'x' of undefined",
    "stacktrace": "..."
  },
  "tags": {
    "component": "ui",
    "version": "1.0.0"
  },
  "extra": {
    "user_action": "clicked_button"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "event-id",
  "message": "Event captured successfully"
}
```

#### Capture Exception
```http
POST /api/sentry/exception
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "TypeError",
  "message": "Cannot read property 'x' of undefined",
  "stack": "Error stack trace...",
  "context": {
    "additional": "data"
  }
}
```

#### Get Sentry Events
```http
GET /api/sentry/events?limit=100&level=error&sentToSentry=true
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (default: 100): Maximum number of events
- `level` (optional): Filter by level (error, warning, info, debug)
- `sentToSentry` (optional): Filter by sent status

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "eventId": "sentry-event-id",
      "level": "error",
      "message": "Error message",
      "tags": {"component": "ui"},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Event Statistics
```http
GET /api/sentry/stats?period=7d
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "period": "7d",
  "eventsByLevel": [
    {"level": "error", "count": 45},
    {"level": "warning", "count": 120}
  ],
  "dailyEvents": [...],
  "totalEvents": 165
}
```

---

### Git Operations Endpoints

#### Clone Repository
```http
POST /api/git/clone
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "url": "https://github.com/user/repo.git",
  "directory": "my-repo", // optional
  "options": {} // optional git options
}
```

**Response:**
```json
{
  "success": true,
  "path": "/workspace/repos/user-id/my-repo",
  "message": "Repository cloned successfully to my-repo"
}
```

#### Get Repository Status
```http
GET /api/git/status?repository=my-repo
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "status": {
    "current": "main",
    "tracking": "origin/main",
    "ahead": 0,
    "behind": 0,
    "modified": ["file1.js"],
    "added": ["file2.js"],
    "deleted": [],
    "renamed": [],
    "conflicted": [],
    "isClean": false
  }
}
```

#### Commit Changes
```http
POST /api/git/commit
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "repository": "my-repo",
  "message": "Add new feature",
  "files": ["file1.js", "file2.js"] // optional, defaults to all
}
```

**Response:**
```json
{
  "success": true,
  "commit": "abc123def456",
  "message": "Committed changes: Add new feature"
}
```

#### Create Branch
```http
POST /api/git/branch
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "repository": "my-repo",
  "name": "feature/new-feature",
  "checkout": true // optional, default true
}
```

#### Pull Changes
```http
POST /api/git/pull
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "repository": "my-repo",
  "remote": "origin", // optional, default "origin"
  "branch": "main" // optional
}
```

#### Push Changes
```http
POST /api/git/push
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "repository": "my-repo",
  "remote": "origin", // optional, default "origin"
  "branch": "main" // optional
}
```

#### List Branches
```http
GET /api/git/branches?repository=my-repo&remote=false
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `repository`: Repository path
- `remote` (default: false): Include remote branches

**Response:**
```json
{
  "success": true,
  "branches": ["main", "develop", "feature/new-feature"],
  "current": "main"
}
```

#### Get Commit Log
```http
GET /api/git/log?repository=my-repo&maxCount=50
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "commits": [
    {
      "hash": "abc123",
      "date": "2024-01-01T00:00:00Z",
      "message": "Initial commit",
      "author_name": "John Doe",
      "author_email": "john@example.com"
    }
  ],
  "latest": {...},
  "total": 150
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Different endpoints have different rate limits:
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- AI endpoints: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Webhooks

The system supports webhooks for real-time updates. Configure webhooks through the ClickUp provider.

## WebSocket Support

For real-time features, WebSocket connections are available at:
```
ws://localhost:3000/ws
```

Authentication is required via query parameter:
```
ws://localhost:3000/ws?token=<jwt-token>
```