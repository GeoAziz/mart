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
cp .env.example .env.local
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

### Docker
The Docker stack uses **Compose profiles** to separate concerns. `docker-compose.yml` defines the core app (including the Firebase emulator and LocalStack, which the app requires at startup); other services are opt-in via profiles.

| Profile | Includes |
|---------|----------|
| *(none)* | `app`, `websocket`, `worker`, `redis`, `firebase-emulator`, `localstack` |
| `auth` | + `traefik`, `keycloak` |
| `security` | + `vault`, `wazuh-manager`, `opa` |
| `monitoring` | + `prometheus`, `prometheus-pushgateway`, `grafana`, `loki`, `tempo`, `otel-collector`, `promtail` |
| `full` | All services (+ `kafka`, `mailpit`, `adminer`, `postgres`, `demo-app`) |

```bash
# Core local dev stack
./scripts/start.sh

# With monitoring
docker compose --profile monitoring up --build

# Auth tier
docker compose --profile auth up --build

# Security tier
docker compose --profile security up --build

# Full stack
docker compose --profile full up --build
```

| Service | URL |
|---------|-----|
| Next.js app | http://localhost:3000 |
| WebSocket | ws://localhost:3001 |
| Firebase emulator UI | http://localhost:4000 |
| LocalStack | http://localhost:4566 |
| Prometheus | http://localhost:9090 (monitoring/full) |
| Pushgateway | http://localhost:9091 (monitoring/full) |
| Grafana | http://localhost:3001 (monitoring/full), admin/`${GRAFANA_ADMIN_PASSWORD:-admin}` |
| Loki | http://localhost:3100 (monitoring/full) |
| Tempo | http://localhost:3200 (monitoring/full) |
| OPA | http://localhost:8181 (security/full) |
| Keycloak | http://localhost:8082 (auth/full) |
| Vault | http://localhost:8200 (security/full) |
| Traefik dashboard | http://localhost:8081 (auth/full) |
| Mailpit UI | http://localhost:8025 (full) |
| Adminer | http://localhost:8080 (full) |
| Postgres | localhost:5432 (full) |
| Kafka | localhost:9092 (full) |

Helper scripts:
```bash
./scripts/start.sh [profile]   # Start services, optionally with a profile
./scripts/stop.sh              # Stop all services
./scripts/bootstrap.sh         # Wait for LocalStack and run manual awslocal bootstrap
./scripts/reset-localstack.sh  # Wipe LocalStack state and restart
```

The stack targets the Firebase emulators by default, so it works with zero external configuration. To use real Firebase instead of the emulators, set `NEXT_PUBLIC_FIREBASE_EMULATOR=false` and unset `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` in the compose environment, then provide real `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` values in your `.env`.

Load-testing overlay (adds k6 + Jaeger, requires monitoring profile):
```bash
docker compose -f docker-compose.yml -f docker-compose.load-test.yml \
  --profile monitoring --profile load-test up
```

---

## 📁 Project Structure

The project uses a **flat root layout** (see `AGENTS.md` for the authoritative
quick reference). Config files, Dockerfiles, Compose, Terraform, and monitoring
configs live alongside the app rather than under `infrastructure/` / `config/`.

```
mart/
├── src/                  # Frontend + API (Next.js App Router, React, Genkit AI)
│   ├── app/              # Routes, layouts, API route handlers, Server Actions
│   ├── components/       # Reusable UI (ShadCN/ui, sections, dashboards)
│   ├── ai/               # Genkit AI flows & initialization
│   ├── context/          # Global React contexts (AuthContext, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Shared utilities, types, services, payments
│   ├── server/           # WebSocket server
│   ├── styles/           # Global CSS (vendor themes, etc.)
│   ├── types/            # Type declarations & shims
│   ├── data/             # Static nav/config data
│   ├── scripts/          # One-off setup/seed/migration scripts (tsx)
│   ├── middleware.ts     # Next.js middleware
│   └── README.md
├── public/               # Static assets
├── tests/                # Python E2E/Selenium test suite (pytest)
├── scripts/              # Shell/ops scripts (localstack-init, k3s, etc.)
├── load-tests/           # k6 load-testing scripts
├── terraform/            # Terraform IaC (k3s staging/local)
├── chart/                # Helm charts
├── monitoring/           # Prometheus, Grafana, Loki, Alertmanager, Wazuh
├── docs/                 # Documentation (by topic / numbered)
├── mlops/                # ML pipeline (training, FastAPI inference, MLflow)
├── Dockerfile            # Next.js multi-stage app build
├── Dockerfile.ws         # WebSocket server image
├── Dockerfile.worker     # Queue worker image
├── Dockerfile.emulator   # Firebase emulator image
├── docker-compose.yml    # Core stack (app, ws, redis, worker, emulators, localstack)
├── docker-compose.load-test.yml  # Load-test overlay (k6 + Jaeger)
├── firebase.json         # Firebase emulator config
├── firestore.rules       # Firestore security rules
├── firestore-indexes.json
├── next.config.ts        # Next.js config (webpack Node-builtin stubs, images)
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts      # JS unit tests (Vitest)
├── package.json
└── .env.example          # Environment variable template
```

### Key Directories

| Directory | Purpose | Learn More |
|-----------|---------|-----------|
| `src/` | Frontend, API, AI | `docs/02-architecture/blueprint.md`, `src/README.md` |
| `tests/` | Python E2E/Selenium tests | `tests/requirements.txt` |
| `scripts/` | Ops & shell scripts | `scripts/setup-devops.sh` |
| `terraform/` | Terraform IaC | `terraform/main.tf` |
| `chart/` | Helm charts | `chart/Chart.yaml` |
| `monitoring/` | Prometheus, Grafana, Loki | `monitoring/prometheus/prometheus.yml` |
| `docs/` | Complete documentation | `docs/README.md` |
| `mlops/` | ML pipeline + inference | `mlops/inference_service.py` |

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
# Start Next.js dev server (+ WebSocket via npm run dev:all)
npm run dev          # http://localhost:3000
npm run dev:all      # Next.js + WebSocket server on :3001

# JS unit/integration tests (Vitest)
npm test

# Python E2E/Selenium tests (requires dev server on :3000, markers: smoke|e2e|integration)
pytest tests/test_master.py -m smoke -v
pytest tests/test_master.py -m e2e -v
pytest tests/test_master.py -m integration -v

# Type checking & lint
npm run typecheck
npm run lint
```

### Infrastructure
```bash
# Local development with Docker (app + websocket + redis + worker + Firebase emulator + LocalStack)
docker compose up --build

# Add monitoring stack (Prometheus, Grafana, Loki, Pushgateway)
docker compose --profile monitoring up --build

# Load testing overlay (requires monitoring profile)
docker compose -f docker-compose.yml -f docker-compose.load-test.yml \\
  --profile monitoring --profile load-test up

# Deploy to Kubernetes (Helm chart)
cd chart && helm upgrade --install mart ./nextn -f values.yaml

# Run Terraform (k3s)
cd terraform && terraform plan && terraform apply
```

### Testing
```bash
# Python E2E/Selenium tests (markers: smoke, e2e, integration)
pytest tests/test_master.py -m smoke -v
pytest tests/test_master.py -m e2e -v
pytest tests/test_master.py -m integration -v

# View test reports: tests/reports/screenshots/

# Load Testing (k6)
cd load-tests
# (requires the monitoring profile: docker compose --profile monitoring up)
```

### Scripts
```bash
# Environment setup
bash scripts/setup-devops.sh

# Seed Firebase data
npm run db:seed                  # src/scripts/seed.ts
npm run seed:vendor-data         # src/scripts/seed-vendor-data.ts

# Import a CSV dataset into Firestore
npm run import:csv               # npm run import:csv -- <dataset-dir>

# Queue workers (background jobs via Redis)
npm run queue:workers
npm run worker:reservation-expiry

# LocalStack initialization (runs inside the localstack container)
# see: scripts/localstack-init.sh
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
3. Run tests: `pytest tests/test_master.py -m smoke -v`
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
- Check `.env.example` for required variables

### Issue: Tests failing
- See `docs/00-getting-started/TESTING_GUIDE.md` for test setup
- Check `docs/03-deployment/` for environment setup

### Issue: Docker build fails
- Review the root `Dockerfile` / `docker-compose.yml`
- Check Docker versions: `docker --version`

For more help, see the [documentation](docs/README.md).
