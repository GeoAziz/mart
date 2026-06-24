# Local Development Quick Reference

## One-liner Setup
```bash
bash scripts/quickstart.sh
```

## Manual Setup Steps

### 1. Initial Configuration
```bash
bash scripts/local-setup.sh
bash scripts/setup-local-credentials.sh
```

### 2. Start Services
```bash
# All services
bash scripts/dev.sh all

# Individual services
bash scripts/dev.sh web           # Next.js only
bash scripts/dev.sh mlops         # MLOps stack
bash scripts/dev.sh monitoring    # Prometheus/Grafana/Loki
bash scripts/dev.sh localstack    # AWS emulation
```

### 3. Validate Setup
```bash
bash scripts/validate-local.sh
```

## Using Make (Alternative)
```bash
make -f Makefile.local help       # Show all commands
make -f Makefile.local local-setup
make -f Makefile.local local-start
make -f Makefile.local local-validate
```

## Service Endpoints

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Web App | http://localhost:3000 | - |
| Health Check | http://localhost:3000/api/health | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin:admin |
| Loki | http://localhost:3100 | - |
| MLflow | http://localhost:5000 | - |
| Inference API | http://localhost:8001 | - |
| LocalStack | http://localhost:4566 | test:test |

## Development Commands

```bash
# Node.js development
npm run dev              # Start Next.js dev server
npm run build            # Build production bundle
npm run typecheck        # Check TypeScript
npm run lint             # Lint code

# Infrastructure
cd terraform && terraform plan
cd terraform && terraform apply -auto-approve

# Kubernetes (requires Kind)
bash scripts/bootstrap-local-k8s.sh

# MLOps
bash mlops/mlflow-setup.sh
./mlflow-server.sh
```

## Common Tasks

### View Logs
```bash
bash scripts/dev.sh logs
docker compose logs -f [service]
```

### Stop Services
```bash
bash scripts/dev.sh stop
# or
docker compose down
docker compose -f docker-compose.mlops.yml down
docker compose -f docker-compose.localstack.yml down
```

### Clean Everything
```bash
make -f Makefile.local dev-clean
# or manually
docker compose down -v
rm -rf terraform.tfstate*
```

### Reset LocalStack
```bash
docker compose -f docker-compose.localstack.yml down -v
docker compose -f docker-compose.localstack.yml up -d
bash scripts/setup-local-credentials.sh
```

### Run Terraform
```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

### Bootstrap Kubernetes Cluster
```bash
# Requires: kind, kubectl, helm
bash scripts/bootstrap-local-k8s.sh
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port (e.g., 3000)
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose files
```

### Services Not Starting
```bash
# Check Docker daemon
docker ps

# View service logs
docker compose logs [service]

# Restart services
docker compose restart
```

### LocalStack Not Ready
```bash
# Wait for health check
curl http://localhost:4566/_localstack/ready

# Restart LocalStack
docker compose -f docker-compose.localstack.yml restart localstack
```

### Terraform State Issues
```bash
# Reset local state
rm terraform.tfstate*

# Reinitialize
cd terraform && terraform init
```

### Database Connection Issues
```bash
# Check if LocalStack is running
curl http://localhost:4566

# Test AWS CLI with LocalStack
aws --endpoint-url=http://localhost:4566 s3 ls
```

## Environment Files

### .env.local
Created by `setup-local-credentials.sh`
- Firebase configuration
- Google AI keys
- LocalStack credentials
- Service URLs

### .aws/credentials
Created by `setup-local-credentials.sh`
- LocalStack AWS credentials (test:test)

### terraform.tfstate
Created by `terraform apply`
- Local Terraform state
- Only for development

## Directory Structure

```
├── docker-compose*.yml        # Docker Compose configurations
├── monitoring/
│   └── docker-compose.yml     # Monitoring stack
├── mlops/
│   ├── mlflow-setup.sh        # MLOps initialization
│   └── docker/                # MLOps Dockerfiles
├── terraform/
│   ├── backend.tf             # Backend configuration
│   ├── provider.tf            # AWS provider
│   └── *.tf                   # Infrastructure code
├── k8s/
│   └── *.yaml                 # Kubernetes manifests
└── scripts/
    ├── local-setup.sh         # Full local setup
    ├── dev.sh                 # Service management
    ├── validate-local.sh      # Validation script
    ├── setup-local-credentials.sh
    ├── quickstart.sh          # One-liner setup
    └── bootstrap-local-k8s.sh # K8s bootstrap
```

## Performance Tips

- Use `docker-compose.local.yml` for web + LocalStack only if developing locally
- Stop unused services: `docker compose -f docker-compose.mlops.yml down`
- Monitor resource usage: `docker stats`
- Use health checks: `curl http://localhost:3000/api/health`

## Next Steps After Setup

1. Start services: `bash scripts/dev.sh all`
2. Run validation: `bash scripts/validate-local.sh`
3. Start development: `npm run dev`
4. Access app: http://localhost:3000
5. Monitor: http://localhost:3001 (Grafana)
