# WhatsApp Clone - Complete Development Guide

## 🚀 Development Versions Overview

This project has multiple development versions to suit different needs and stages of development.

### Version 1: Frontend Demo (Current - No Backend Required)
- **Purpose**: UI/UX testing and frontend development
- **Features**: Mock authentication, sample chats, full UI functionality
- **Requirements**: Only Node.js and npm
- **Best for**: Frontend developers, UI testing, design validation

### Version 2: Frontend + Mock API (JSON Server)
- **Purpose**: API integration testing without complex backend
- **Features**: RESTful API simulation, persistent data
- **Requirements**: Node.js, JSON Server
- **Best for**: Frontend-backend integration testing

### Version 3: Full Stack Development (NestJS + PostgreSQL)
- **Purpose**: Complete application development
- **Features**: Real authentication, database, WebSocket, file upload
- **Requirements**: Node.js, PostgreSQL, Redis, RabbitMQ
- **Best for**: Full-stack development, production preparation

### Version 4: Production Ready (Docker + Microservices)
- **Purpose**: Production deployment
- **Features**: Containerized services, scalable architecture
- **Requirements**: Docker, Docker Compose
- **Best for**: Production deployment, DevOps testing

---

## 📋 Version 1: Frontend Demo (Current Setup)

### Quick Start
```bash
npm install
npm run dev
```

### Login Credentials
- **Email**: Any email (e.g., `demo@example.com`)
- **Password**: Any password (e.g., `password123`)

### Features Available
- ✅ Authentication UI (mock)
- ✅ Chat interface with sidebar
- ✅ Message sending/receiving (local)
- ✅ Emoji picker
- ✅ Online/offline status (mock)
- ✅ Responsive design
- ✅ Dark/light theme support
- ✅ Typing indicators (mock)
- ✅ Message status (sent/delivered/read)

### File Structure
```
src/
├── components/
│   ├── Auth/           # Login/Register components
│   └── Chat/           # Chat interface components
├── store/              # Redux store with mock data
├── services/           # API and socket services (mocked)
└── hooks/              # Custom React hooks
```

---

## 📋 Version 2: Frontend + Mock API Setup

### Installation
```bash
# Install JSON Server globally
npm install -g json-server

# Create mock database
npm run setup:mock-api

# Start mock API server
npm run start:mock-api

# Start frontend (in another terminal)
npm run dev
```

### Mock API Endpoints
- `GET /users` - Get all users
- `GET /chats` - Get user chats
- `GET /messages` - Get chat messages
- `POST /auth/login` - Mock login
- `POST /auth/register` - Mock registration

---

## 📋 Version 3: Full Stack Development Setup

### Prerequisites
```bash
# Install Node.js 18+
node --version

# Install PostgreSQL
# Install Redis
# Install RabbitMQ
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Frontend Setup
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start development server
npm run dev
```

### WebSocket Server Setup
```bash
# Navigate to websocket directory
cd websocket

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start WebSocket server
npm run dev
```

---

## 📋 Version 4: Production Docker Setup

### Prerequisites
```bash
# Install Docker and Docker Compose
docker --version
docker-compose --version
```

### Quick Start
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **RabbitMQ Management**: http://localhost:15672

---

## 🔧 Environment Configuration

### Frontend (.env)
```env
# Version 1 & 2 (Mock/JSON Server)
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=http://localhost:3002
VITE_MOCK_MODE=true

# Version 3 & 4 (Full Stack)
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=http://localhost:3002
VITE_MOCK_MODE=false
```

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://whatsapp_user:whatsapp_password@localhost:5432/whatsapp_db

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://whatsapp:rabbitmq_password@localhost:5672

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🧪 Testing

### Unit Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# WebSocket tests
cd websocket && npm test
```

### Integration Tests
```bash
# API integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## 📱 Mobile Development

### React Native Setup (Optional)
```bash
# Install React Native CLI
npm install -g @react-native-community/cli

# Create mobile app
npx react-native init WhatsAppMobile

# Install dependencies
cd WhatsAppMobile
npm install
```

---

## 🚀 Deployment Options

### Option 1: Vercel (Frontend Only)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 2: Heroku (Full Stack)
```bash
# Install Heroku CLI
# Create Heroku apps
heroku create whatsapp-frontend
heroku create whatsapp-backend

# Deploy
git push heroku main
```

### Option 3: AWS/DigitalOcean (Docker)
```bash
# Build and push Docker images
docker build -t whatsapp-frontend ./frontend
docker build -t whatsapp-backend ./backend

# Deploy to cloud provider
```

---

## 📊 Monitoring & Analytics

### Development Tools
- **Redux DevTools**: Browser extension for state debugging
- **React Developer Tools**: Component tree inspection
- **Network Tab**: API call monitoring
- **Console Logs**: Real-time debugging

### Production Monitoring
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Google Analytics**: User analytics
- **Prometheus**: Metrics collection

---

## 🔒 Security Considerations

### Development
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Use environment variables for secrets

### Production
- Enable CORS properly
- Use secure headers
- Implement CSP (Content Security Policy)
- Regular security audits

---

## 📚 Learning Resources

### Frontend
- [React Documentation](https://react.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [Tailwind CSS](https://tailwindcss.com)

### Backend
- [NestJS Documentation](https://nestjs.com)
- [Socket.IO Guide](https://socket.io/docs)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs)

### DevOps
- [Docker Documentation](https://docs.docker.com)
- [Kubernetes Tutorial](https://kubernetes.io/docs)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details