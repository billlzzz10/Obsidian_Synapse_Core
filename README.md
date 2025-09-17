# Blink Note - Advanced Obsidian Plugin with Backend Services

A powerful Obsidian plugin that integrates with ClickUp, provides AI-powered assistance through multiple providers, and includes comprehensive development tools with Sentry error tracking and Git operations.

## 🏗️ Project Structure

```
.
├── src/                        # Obsidian plugin source code
│   ├── agents/                 # AI agent implementations
│   ├── tools/                  # Tool implementations
│   ├── providers/              # Service providers (ClickUp, AI models)
│   └── tests/                  # Plugin tests
├── express-oauth-backend/      # Backend services
│   ├── src/
│   │   ├── providers/          # Backend providers (ClickUp, Sentry, Git, AI)
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Express middleware
│   │   └── services/           # Business logic services
│   └── prisma/                 # Database schema
└── docs/                       # Documentation

```

## 🚀 Features

### Obsidian Plugin Features
- **AI Agent Integration**: Support for multiple AI models (OpenAI, Claude, Google AI, etc.)
- **ClickUp Integration**: Full OAuth 2.0 implementation with comprehensive API coverage
- **Tool System**: Extensible tool architecture for various operations
- **Discovery Search**: Advanced search capabilities across your knowledge base

### Backend Services
- **OAuth 2.0 Management**: Secure token storage and management for ClickUp
- **Multi-AI Provider Proxy**: Unified interface for multiple AI services
- **Sentry Integration**: Comprehensive error tracking and performance monitoring
- **Git Operations**: Repository management capabilities
- **Secure API**: JWT-based authentication with rate limiting

## 🛠️ Technology Stack

### Frontend (Obsidian Plugin)
- TypeScript
- Obsidian API
- Vitest for testing

### Backend
- Node.js with Express.js
- TypeScript
- Prisma ORM with SQLite
- JWT Authentication
- Multiple AI Provider SDKs
- Sentry SDK
- Simple-git

## 📋 Prerequisites

- Node.js 16+
- npm or yarn
- Obsidian (for plugin usage)
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/blink-note.git
cd blink-note
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd express-oauth-backend
npm install
```

### 4. Configure Environment Variables
```bash
cd express-oauth-backend
cp .env.example .env
# Edit .env with your API keys and configuration
```

Required environment variables:
- `CLICKUP_CLIENT_ID` & `CLICKUP_CLIENT_SECRET`: ClickUp OAuth credentials
- `SENTRY_DSN`: Sentry project DSN
- `JWT_SECRET`: Secret for JWT token generation
- AI Provider API Keys (as needed):
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_AI_API_KEY`
  - `HUGGINGFACE_API_KEY`
  - `XAI_API_KEY`
  - `OPENROUTER_API_KEY`

### 5. Initialize Database
```bash
cd express-oauth-backend
npx prisma generate
npx prisma migrate dev
```

## 🏃‍♂️ Running the Application

### Development Mode

#### Frontend (Obsidian Plugin)
```bash
npm run dev
```

#### Backend
```bash
cd express-oauth-backend
npm run dev
```

### Production Mode

#### Build Frontend
```bash
npm run build
```

#### Build and Run Backend
```bash
cd express-oauth-backend
npm run build
npm start
```

## 🧪 Testing

### Run Frontend Tests
```bash
npm test
```

### Run Backend Tests
```bash
cd express-oauth-backend
npm test
```

### Test Coverage
```bash
cd express-oauth-backend
npm run test:coverage
```

## 📚 API Documentation

See [API.md](./express-oauth-backend/API.md) for detailed API documentation.

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/clickup/authorize` - Get ClickUp OAuth URL
- `GET /auth/clickup/callback` - ClickUp OAuth callback

#### AI Services
- `GET /api/ai/providers` - List available AI providers
- `GET /api/ai/models` - List available models
- `POST /api/ai/chat` - Send chat completion request
- `POST /api/ai/chat/stream` - Stream chat completion

#### Sentry Integration
- `POST /api/sentry/capture` - Capture Sentry event
- `GET /api/sentry/events` - Get user's Sentry events
- `GET /api/sentry/stats` - Get event statistics

#### Git Operations
- `POST /api/git/clone` - Clone repository
- `POST /api/git/commit` - Commit changes
- `GET /api/git/status` - Get repository status
- `GET /api/git/branches` - List branches

## 🔒 Security

- All API endpoints (except auth) require JWT authentication
- OAuth tokens are encrypted and stored securely
- Rate limiting is implemented on all endpoints
- HTTPS is required for production deployment
- Environment variables for sensitive configuration

## 🚀 Deployment

### Backend Deployment

The backend can be deployed to any Node.js hosting platform:

#### Heroku
```bash
cd express-oauth-backend
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

#### Docker
```bash
cd express-oauth-backend
docker build -t blink-note-backend .
docker run -p 3000:3000 --env-file .env blink-note-backend
```

### Frontend Deployment

The Obsidian plugin should be:
1. Built using `npm run build`
2. The `main.js` and `manifest.json` files should be copied to your Obsidian vault's `.obsidian/plugins/blink-note/` directory

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Obsidian team for the excellent plugin API
- All the AI provider teams for their APIs
- ClickUp for their comprehensive API
- Open source community for the amazing tools and libraries

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.