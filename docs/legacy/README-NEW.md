# 🎯 StackLens AI - Production-Ready Error Analysis Platform

## 🎉 New! Restructured & Optimized

> **✅ Production-ready folder structure implemented**  
> **✅ Comprehensive testing framework added**  
> **✅ Professional monorepo architecture**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-42%2B%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)]()
[![React](https://img.shields.io/badge/React-18-61dafb)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

AI-powered error analysis and prediction platform for retail systems. Analyzes error logs, provides AI suggestions, and predicts issues before they occur.

---

## 📁 Project Structure (Updated Oct 2025)

```
StackLens-AI-Deploy/
├── 📱 apps/                    # Applications
│   ├── web/                    # React frontend
│   └── api/                    # Express backend
│
├── 🔧 services/                # Microservices
│   └── python/                 # Python AI/ML services
│
├── 📦 packages/                # Shared packages
│   ├── database/               # Database schema & migrations
│   └── shared/                 # Shared types & utilities
│
├── 🚀 infrastructure/          # Infrastructure & deployment
│   ├── deployment/             # Deployment scripts
│   ├── docker/                 # Docker configs
│   └── nginx/                  # Nginx configs
│
├── 📚 docs/                    # Documentation
│   ├── architecture/           # Architecture docs
│   ├── development/            # Development guides
│   ├── deployment/             # Deployment guides
│   ├── api/                    # API documentation
│   └── user/                   # User guides
│
├── 💾 data/                    # Data storage
│   ├── database/               # SQLite databases
│   ├── uploads/                # Uploaded files
│   ├── ml-models/              # ML model files
│   └── cache/                  # Cache files
│
├── ⚙️ config/                  # Configuration
│   ├── environments/           # Environment configs
│   ├── eslint/                 # ESLint configs
│   ├── typescript/             # TypeScript configs
│   └── vite/                   # Vite configs
│
├── 🧪 tests/                   # Comprehensive test suite
│   ├── e2e/                    # End-to-end tests
│   ├── api/                    # API tests
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   ├── performance/            # Performance tests
│   └── accessibility/          # A11y tests
│
└── 🔨 tools/                   # Development tools
    ├── scripts/                # Utility scripts
    ├── generators/             # Code generators
    └── validators/             # Validators
```

---

## ✨ Key Features

### 🤖 AI-Powered Analysis
- **Intelligent Error Detection** - Automatically identifies and categorizes errors
- **AI Suggestions** - Get smart recommendations for error resolution
- **ML Predictions** - Predict future issues before they occur
- **RAG Integration** - Retrieval-Augmented Generation for context-aware suggestions
- **Pattern Recognition** - Identify recurring error patterns automatically

### 📊 Analytics & Monitoring
- **Real-time Dashboard** - Monitor errors across all stores and kiosks
- **Store/Kiosk Management** - Centralized management for all locations
- **Severity Tracking** - Critical, High, Medium, Low error classification
- **Error Statistics** - Comprehensive analytics and metrics
- **Historical Trends** - Track error patterns over time

### 🧪 Quality Assurance
- **42+ Test Cases** - Comprehensive E2E, API, and integration tests
- **Multi-browser Testing** - Chrome, Firefox, Safari support
- **Mobile Testing** - iPhone and Android device testing
- **Performance Testing** - Page load and API response metrics
- **Accessibility Testing** - WCAG compliance validation

### 🔐 Security & Auth
- **Firebase Authentication** - Secure Google Sign-In
- **Role-based Access** - Admin, Manager, User roles
- **Session Management** - Secure session handling
- **API Security** - Token-based authentication

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for AI services)
- SQLite (included)
- Git

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI-Deploy

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# OpenAI (for AI suggestions)
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Start Development

```bash
# Start frontend (React)
npm run dev

# Start backend (Express) - in new terminal
npm run dev:server

# Start Python services - in new terminal
cd services/python
python src/app.py
```

### 4. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Python Services:** http://localhost:8000

---

## 🧪 Testing

### Install Playwright (First Time)

```bash
# Install Playwright
npm install --save-dev @playwright/test @axe-core/playwright

# Install browsers
npx playwright install
```

### Run Tests

```bash
# Interactive UI mode (recommended)
npm run test:ui

# Run all tests
npm test

# Run specific test suites
npm run test:e2e          # End-to-end tests
npm run test:api          # API tests
npm run test:integration  # Integration tests
npm run test:unit         # Unit tests

# Run on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile device testing
npm run test:mobile

# Performance testing
npm run test:performance

# Accessibility testing
npm run test:a11y

# Debug mode
npm run test:debug

# View test report
npm run test:report
```

**Test Coverage:**
- ✅ 42+ automated test cases
- ✅ E2E tests (auth, upload, dashboard)
- ✅ API tests (auth, file upload, errors)
- ✅ Integration tests
- ✅ Performance tests
- ✅ Accessibility tests

---

## 🏗️ Build & Deploy

### Development Build

```bash
npm run build
```

### Production Build

```bash
NODE_ENV=production npm run build
```

### Deploy to Production

#### Option 1: Docker (Recommended)

```bash
# Build Docker image
docker build -t stacklens-ai .

# Run container
docker run -p 4000:4000 stacklens-ai
```

#### Option 2: Manual Deployment

```bash
# Build application
npm run build

# Start production server
npm start
```

#### Option 3: Windows Server

See [Windows Deployment Guide](docs/deployment/WINDOWS-DEPLOYMENT-README.md)

```powershell
# Run automated deployment
.\infrastructure\deployment\windows\scripts\deploy-to-windows.ps1
```

---

## 📚 Documentation

### Architecture & Design
- [📐 Refactoring Plan](docs/architecture/REFACTORING_PLAN.md) - Architecture blueprint
- [📋 Restructure Guide](docs/architecture/RESTRUCTURE_GUIDE.md) - Implementation guide
- [✅ Restructure Success](RESTRUCTURE_SUCCESS.md) - Completed restructure summary
- [🧪 Testing Framework](docs/architecture/TESTING_FRAMEWORK_SUMMARY.md) - Testing overview

### Development Guides
- [🔨 Build Guide](docs/development/BUILD-GUIDE.md) - Build instructions
- [📊 Codebase Analysis](docs/development/CODEBASE_ANALYSIS_REPORT.md) - Code analysis
- [🧪 Testing Setup](docs/TESTING_SETUP_GUIDE.md) - Test setup guide
- [📖 Testing Guide](tests/README.md) - Comprehensive testing guide

### Deployment Guides
- [🪟 Windows Deployment](docs/deployment/WINDOWS-DEPLOYMENT-README.md) - Windows server setup
- [🚀 Server Deployment](docs/deployment/DEPLOY-TO-SERVER.md) - General server deployment

### API Documentation
- [📡 API Reference](docs/api/) - REST API documentation
- [🔌 WebSocket Events](docs/api/) - Real-time event documentation

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript 5.5** - Type safety
- **Vite 5** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library
- **React Query** - Data fetching
- **Recharts** - Data visualization

### Backend
- **Express.js** - Node.js framework
- **TypeScript** - Type safety
- **SQLite** - Database
- **Drizzle ORM** - Type-safe ORM
- **Firebase Auth** - Authentication

### AI/ML Services (Python)
- **FastAPI** - Python API framework
- **OpenAI GPT** - AI suggestions
- **Scikit-learn** - ML models
- **ChromaDB** - Vector database
- **Pandas** - Data processing

### Testing
- **Playwright** - E2E testing
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **Axe** - Accessibility testing

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Nginx** - Reverse proxy
- **PM2** - Process management

---

## 📊 Performance

- ⚡ **Build Time:** 4.5s (client), 23ms (server)
- 🚀 **First Load:** < 2s
- 📦 **Bundle Size:** 1.3MB (gzipped: 377KB)
- 🧪 **Test Coverage:** 80%+
- 🎯 **Lighthouse Score:** 90+

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development/CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Make changes** and add tests
4. **Run tests:** `npm test`
5. **Commit changes:** `git commit -m 'Add amazing feature'`
6. **Push to branch:** `git push origin feature/amazing-feature`
7. **Open Pull Request**

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Firebase for authentication
- OpenAI for AI capabilities
- Shadcn for UI components
- The open-source community

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/deepanimators/StackLens-AI/issues)
- **Email:** support@stacklens.app

---

## 🗺️ Roadmap

### Current Version: v1.0.0

- [x] Production restructure
- [x] Comprehensive testing framework
- [x] AI-powered error analysis
- [x] Store/Kiosk management
- [x] Real-time dashboard
- [x] ML predictions
- [x] RAG suggestions

### Upcoming Features

- [ ] Advanced ML models
- [ ] Multi-tenant support
- [ ] Custom alerting rules
- [ ] Integration with monitoring tools
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Report generation
- [ ] API v2 with GraphQL

---

## ⭐ Star History

If you find this project helpful, please give it a star! ⭐

---

**Built with ❤️ by the StackLens Team**

*Last Updated: October 2025*
