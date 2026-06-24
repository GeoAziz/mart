# ZilaCart

A futuristic digital marketplace for Kenya. Built with Next.js, Firebase, and Genkit AI.

## Features
- E-commerce platform with admin, vendor, and customer roles
- Product moderation, order management, payouts, refunds
- AI-powered chatbot for customer support
- Responsive design for desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project (for Firestore, Auth, etc.)
- Google AI/Genkit API keys (for chatbot)

### Setup
```bash
git clone <your-repo-url>
cd mart
npm install
```

### Environment Variables
Copy and configure environment variables:
```bash
cp config/.env.example .env.local
# Edit .env.local with your Firebase and AI credentials
```

Required variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
FIREBASE_ADMIN_PRIVATE_KEY=...
GENKIT_API_KEY=...
```

### Development
```bash
npm run dev
# Open http://localhost:3000
```

### Build & Deploy
```bash
npm run build
npm start
```

Deploy to Vercel: Connect your repo and set environment variables in the Vercel dashboard.

---

## 📁 Project Structure

```
mart/
├── src/                   # Frontend application (Next.js, React)
│   ├── app/              # Next.js app routes and layouts
│   ├── components/       # Reusable UI components
│   ├── ai/              # AI chatbot flows and utilities
│   └── lib/             # Shared utilities and types
│
├── backend/             # Backend code, tests, and scripts
│   ├── scripts/         # Utility and setup scripts
│   ├── tests/           # Test suites and artifacts
│   └── pytest.ini       # Pytest configuration
│
├── infrastructure/      # Infrastructure as Code
│   ├── docker/         # Docker compose configurations
│   ├── kubernetes/     # Kubernetes manifests
│   ├── terraform/      # Infrastructure as Code (Terraform)
│   ├── ansible/        # Configuration management
│   ├── monitoring/     # Prometheus, Grafana, Loki
│   └── helm/           # Helm charts
│
├── config/              # Application configuration
│   ├── next.config.ts   # Next.js config
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── firebase/        # Firebase security rules
│
├── mlops/               # ML/Ops pipeline
│   ├── training/        # Model training
│   ├── kubernetes/      # K8s ML deployments
│   └── monitoring/      # ML-specific monitoring
│
├── docs/                # Complete documentation
│   ├── 00-getting-started/
│   ├── 01-user-guides/
│   ├── 02-architecture/
│   ├── 03-deployment/
│   ├── 04-research/
│   └── 05-implementation/
│
├── tools/               # Developer utilities and AI assistants
│   ├── ai-maestro/      # Project planning
│   ├── analysecodebase/ # Codebase analysis
│   ├── docker-expert/   # Docker optimization
│   ├── devops-iac-engineer/
│   └── ... (other tools)
│
├── public/              # Static assets
├── node_modules/        # NPM dependencies
├── package.json         # Node.js dependencies
└── .env.example         # Environment template
```

### Key Directories

| Directory | Purpose | Learn More |
|-----------|---------|-----------|
| `src/` | Frontend code | `docs/02-architecture/blueprint.md` |
| `backend/` | Tests, scripts, utilities | `backend/README.md` |
| `infrastructure/` | Deployment & ops config | `infrastructure/README.md` |
| `config/` | App configuration files | `config/README.md` |
| `mlops/` | Machine learning pipeline | `mlops/README.md` |
| `docs/` | Complete documentation | `docs/README.md` |
| `tools/` | Development utilities | `tools/README.md` |

---

## 📚 Documentation

### Quick Links
- **New to the project?** → [Getting Started Guide](docs/00-getting-started/LOCAL_SETUP.md)
- **Setting up development?** → [Local Setup](docs/00-getting-started/LOCAL_SETUP.md)
- **Need architecture details?** → [Blueprint](docs/02-architecture/blueprint.md)
- **Deploying to production?** → [Deployment Guide](docs/03-deployment/PRODUCTION_DEPLOYMENT.md)
- **Need a checklist?** → [Production Readiness](docs/03-deployment/PRODUCTION_READINESS_CHECKLIST.md)
- **User documentation?** → [User Guide](docs/01-user-guides/USER_GUIDE.md)
- **Admin operations?** → [Admin Guide](docs/01-user-guides/ADMIN.md)

### Full Documentation Index
See [docs/README.md](docs/README.md) for complete documentation navigation.

---

## 🛠️ Common Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
pytest backend/tests/

# Type checking
npx tsc --noEmit

# Lint code
npm run lint
```

### Infrastructure
```bash
# Local development with Docker
cd infrastructure/docker/compose
docker-compose -f docker-compose.local.yml up

# Deploy to Kubernetes
cd infrastructure/kubernetes/core
kubectl apply -f .

# Run Terraform
cd infrastructure/terraform
terraform plan && terraform apply
```

### Testing
```bash
# Run all tests
pytest backend/tests/

# Run E2E tests
pytest backend/tests/e2e/

# Run unit tests
pytest backend/tests/unit/

# View test reports
# Check: backend/tests/screenshots/

# Load Testing
cd backend/tests
./run_load_test.sh              # Interactive test selection
locust -f load_test_scenarios.py --headless -u 100 -r 10  # Quick test
python run_load_tests.py --test all  # All phases sequentially
```

### Scripts
```bash
# Setup environment
backend/scripts/setup/setup_environment.sh

# Generate test data
python backend/scripts/data-generation/create_test_products.py

# Run E2E tests
python backend/scripts/run_selenium_test.py
```

---

## 🚀 Deployment

### Local Development
```bash
npm install
npm run dev
```

### Staging
See [PRODUCTION_DEPLOYMENT.md](docs/03-deployment/PRODUCTION_DEPLOYMENT.md)

### Production
1. Review [Production Readiness Checklist](docs/03-deployment/PRODUCTION_READINESS_CHECKLIST.md)
2. Follow [Deployment Guide](docs/03-deployment/PRODUCTION_DEPLOYMENT.md)
3. Set up [GitHub Secrets](docs/03-deployment/GITHUB_SECRETS_SETUP.md)

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pytest backend/tests/`
4. Commit with clear message: `git commit -m "Add feature: ..."`
5. Push and create a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📋 Project Status

Current status and implementation details: [Implementation Report](docs/05-implementation/FINAL_IMPLEMENTATION_REPORT.md)

Progress tracking: [Progress Notes](docs/05-implementation/progress.md)

---

## 📄 License

MIT License - See LICENSE file for details

---

## ⚡ Enable AI Features (Optional)

The core e-commerce functionality is working. To enable advanced AI features:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"** and copy
3. Add to `.env.local`: `GOOGLE_API_KEY=...`
4. Restart dev server

All AI features will now be active!

---

## 🆘 Troubleshooting

### Issue: Module not found
- Clear cache: `rm -rf .next node_modules && npm install`
- Check tsconfig.json paths in `config/tsconfig.json`

### Issue: Environment variables not loading
- Restart dev server after changing `.env.local`
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Check `config/.env.example` for required variables

### Issue: Tests failing
- See `backend/README.md` for test setup
- Check `docs/03-deployment/` for environment setup

### Issue: Docker build fails
- Review `infrastructure/docker/README.md`
- Check Docker versions: `docker --version`

For more help, see the [documentation](docs/README.md).
