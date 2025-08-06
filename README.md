# PackSafe - Decentralized Package Manager

A comprehensive dependency health monitoring tool that integrates with VS Code to provide real-time vulnerability alerts, license compliance checks, and package management analytics.

## 🚀 Features

- **VS Code Extension**: Real-time dependency scanning with status bar integration
- **Web Dashboard**: Analytics and project management interface
- **WhatsApp Integration**: Critical alerts and command support
- **Real-time Updates**: WebSocket-powered live notifications
- **License Compliance**: Automated license compatibility checks
- **Vulnerability Detection**: Integration with Snyk and npm audit
- **MongoDB + In-Memory Cache**: Scalable data storage and efficient caching

## 🏗️ Architecture

This is a monorepo containing:

- `packages/server` - Node.js/TypeScript backend with MongoDB and in-memory cache
- `packages/client` - React/TypeScript frontend with Tailwind CSS v3
- `packages/vscode-extension` - VS Code extension for IDE integration
- `packages/whatsapp-bot` - WhatsApp bot service for notifications
- `packages/shared` - Shared types, constants, and utilities

## 🛠️ Tech Stack

### Backend

- Node.js + TypeScript + Express
- MongoDB with Mongoose ODM
- In-memory cache for npm registry data and vulnerability reports
- Socket.IO for real-time communication
- JWT authentication

### Frontend

- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS v3 for styling
- React Query for data fetching
- React Router for navigation
- Recharts for data visualization

### VS Code Extension

- VS Code Extension API
- TypeScript
- WebSocket client for real-time updates

### WhatsApp Bot

- Twilio WhatsApp API
- Express webhook server
- High-performance in-memory caching system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- MongoDB (local or remote)
- MongoDB (local or remote)
- VS Code (for extension development)

### Installation

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd packsafe
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**

   ```bash
   # MongoDB (if running locally)
   mongod
   ```

4. **Start the development servers:**

   ```bash
   # Start all services in development mode
   npm run dev

   # Or start individually:
   npm run dev:server   # Backend server (port 3001)
   npm run dev:client   # Frontend client (port 5173)
   npm run dev:whatsapp # WhatsApp bot service
   ```

5. **Install VS Code extension (development):**
   ```bash
   cd packages/vscode-extension
   npm run compile
   # Press F5 in VS Code to launch extension host
   ```

## 📦 Available Scripts

### Root Level

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean all build artifacts
- `npm test` - Run tests across all packages

### Individual Packages

- `npm run dev:server` - Start backend server
- `npm run dev:client` - Start frontend client
- `npm run dev:extension` - Watch compile VS Code extension
- `npm run dev:whatsapp` - Start WhatsApp bot service

## 🔧 Configuration

### Server Configuration

Edit `packages/server/.env`:

- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - JWT signing secret
- `SNYK_API_KEY` - Snyk API key for vulnerability data

### VS Code Extension

Configure in VS Code settings:

- `packsafe.apiKey` - API key from dashboard
- `packsafe.serverUrl` - Backend server URL
- `packsafe.autoScan` - Auto-scan on package.json changes

### WhatsApp Bot

Set Twilio credentials in `.env`:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

## 🏃‍♂️ Development Workflow

1. **Backend Development:**

   ```bash
   cd packages/server
   npm run dev  # Starts with ts-node-dev for hot reload
   ```

2. **Frontend Development:**

   ```bash
   cd packages/client
   npm run dev  # Starts Vite dev server with HMR
   ```

3. **VS Code Extension Development:**
   ```bash
   cd packages/vscode-extension
   npm run watch  # Watch compile TypeScript
   # Press F5 in VS Code to test extension
   ```

## 🚢 Deployment

### Production Build

```bash
npm run build  # Builds all packages for production
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Individual Service Deployment

Each package can be deployed independently:

- Server: Node.js app (Render, AWS, etc.)
- Client: Static files (Vercel, Netlify, etc.)
- WhatsApp Bot: Node.js service
- VS Code Extension: Publish to marketplace

## 📊 Features Overview

### VS Code Extension

- 📊 Status bar showing dependency health
- 🔍 Hover tooltips with package details
- ⚡ Real-time vulnerability alerts
- 🎯 Command palette integration
- 🔄 Auto-scan on file changes

### Web Dashboard

- 📈 Project analytics and trends
- 🛡️ Vulnerability management
- ⚖️ License compliance checks
- 🔄 Real-time updates via WebSocket
- 📱 Responsive Tailwind CSS design

### WhatsApp Integration

- 🚨 Critical vulnerability alerts
- 💬 Command support (`/upgrade`, `/status`)
- 👥 Team notifications
- 📊 Status reports on demand

## 🧪 Testing

```bash
npm test  # Run all tests
npm run test:server    # Server tests only
npm run test:client    # Client tests only
npm run test:extension # Extension tests only
```

## 📚 API Documentation

### REST Endpoints

- `GET /api/projects` - List projects
- `POST /api/scan` - Trigger dependency scan
- `GET /api/vulnerabilities` - Get vulnerabilities
- `GET /api/licenses` - Get license information

### WebSocket Events

- `scan_update` - Real-time scan progress
- `vulnerability_alert` - New vulnerability detected
- `project_update` - Project status changed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Discussions](discussions/)

## 🙏 Acknowledgments

- Snyk for vulnerability data
- npm registry for package metadata
- Twilio for WhatsApp integration
- VS Code team for extension APIs
