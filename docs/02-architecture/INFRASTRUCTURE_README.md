# Nextn Infrastructure & Deployment

Complete production-ready infrastructure, deployment, and observability setup for the Nextn application.

## 📋 Contents

- **Health endpoint**: `/api/health` for Kubernetes probes and monitoring
- **Terraform**: Infrastructure as Code for AWS/LocalStack
- **Kubernetes**: Manifests for deployment, networking, security
- **Helm**: Production-grade Helm chart
- **Monitoring**: Prometheus, Grafana, AlertManager
- **CI/CD**: GitHub Actions workflows for build, test, deploy, scan
- **Security**: Pod Security Policies, image scanning, dependency checks

## 🚀 Quick Start

### Local Development

```bash
# 1. Start LocalStack (for local AWS simulation)
docker-compose up -d localstack

# 2. Deploy infrastructure to LocalStack
cd terraform
terraform init
terraform plan
terraform apply

# 3. Start the application
npm run dev

# 4. Verify health endpoint
curl http://localhost:3000/api/health
```

### Production Deployment

```bash
# 1. Set up GitHub Secrets (see docs/GITHUB_SECRETS_SETUP.md)
# 2. Push to main branch
git push origin main

# 3. GitHub Actions will:
#    - Build and scan Docker image
#    - Run tests
#    - Push to GHCR
#    - Deploy to Kubernetes (if secrets configured)

# 4. Monitor deployment
kubectl get deployment nextn -n app --watch
```

## 📦 Files & Directories

### Application Health
- `src/app/api/health/route.ts` - Health check endpoint
- `src/app/api/metrics/route.ts` - Prometheus metrics endpoint

### Kubernetes Manifests
- `k8s/deployment.yaml` - Base deployment
- `k8s/monitoring-servicemonitor.yaml` - Prometheus ServiceMonitor
- `k8s/prometheus-rules.yaml` - Alert rules
- `k8s/alertmanager-config.yaml` - AlertManager configuration
- `k8s/grafana-provisioning.yaml` - Grafana dashboards
- `k8s/namespace.yaml` - Pod Security Admission labels
- `k8s/rbac.yaml` - ServiceAccount and RBAC binding

### Helm Chart
- `chart/nextn/Chart.yaml` - Chart metadata
- `chart/nextn/values.yaml` - Default values
- `chart/nextn/templates/deployment.yaml` - Deployment template
- `chart/nextn/templates/service.yaml` - Service template

### Terraform (Infrastructure as Code)
- `terraform/provider.tf` - Provider configuration (AWS/LocalStack)
- `terraform/backend.tf` - Remote state configuration
- `terraform/state-backend-setup.tf` - S3 + DynamoDB backend setup
- `terraform/s3.tf` - S3 bucket definition
- `terraform/dynamodb.tf` - DynamoDB table definition
- `terraform/variables.tf` - Input variables
- `terraform/outputs.tf` - Output values

### Docker
- `Dockerfile` - Multi-stage production image with health checks

### GitHub Actions Workflows
- `.github/workflows/build-and-push.yml` - Build, scan, push image
- `.github/workflows/deploy-helm.yml` - Deploy via Helm
- `.github/workflows/terraform-localstack.yml` - Terraform validation
- `.github/workflows/security-scanning.yml` - Trivy + Snyk + OWASP
- `.github/workflows/integration-tests-kind.yml` - Kind cluster tests
- `.github/workflows/e2e-tests.yml` - End-to-end tests
- `.github/workflows/e2e-shipping.yml` - Complete user journey tests

### Documentation
- `docs/GITHUB_SECRETS_SETUP.md` - GitHub Secrets configuration
- `docs/PRODUCTION_DEPLOYMENT.md` - Production deployment guide
- `docs/SDET_FRAMEWORK.md` - QA automation framework
- `docs/SELENIUM_TESTING_GUIDE.md` - Selenium test suite

## 🔒 Security Features

### Image Security
- ✅ Multi-stage Docker build (minimal attack surface)
- ✅ Non-root user execution
- ✅ Read-only root filesystem option
- ✅ Health checks in Dockerfile
- ✅ Trivy vulnerability scanning
- ✅ Snyk dependency scanning
- ✅ OWASP Dependency-Check
- ✅ SBOM generation (Syft)

### Kubernetes Security
- ✅ Pod Security Policies (restricted)
- ✅ Network policies (optional)
- ✅ RBAC (role-based access control)
- ✅ Resource quotas
- ✅ Security context (runAsNonRoot, fsGroup)
- ✅ AppArmor/SELinux labels
- ✅ No privileged containers

### Secrets Management
- ✅ GitHub Secrets for sensitive data
- ✅ Sealed Secrets for Kubernetes
- ✅ No hardcoded credentials
- ✅ KUBECONFIG encryption
- ✅ Vault integration (optional)

## 📊 Observability

### Metrics
- **Prometheus** collects metrics every 30s
- **ServiceMonitor** auto-configures scraping
- **Custom metrics** via `/api/metrics` endpoint
- **Recording rules** for efficiency

### Dashboards
- **Grafana** dashboards with:
  - Application status gauge
  - Request rate (5m)
  - P95 latency
  - Error rate (5xx)
  - Resource usage
  - Pod restart tracking

### Alerting
- **PrometheusRule** defines alert conditions:
  - Application down (critical)
  - High error rate (warning)
  - High latency (warning)
  - Pod restarts (warning)
  - Memory/CPU threshold (warning)
- **AlertManager** routes to:
  - Slack (#alerts, #alerts-warning, #nextn-alerts)
  - PagerDuty (for critical)
  - Email (optional)

## 🔄 CI/CD Pipeline

```
Git Push
  ↓
Build & Scan (security-scanning.yml)
  ├─ Trivy (image vulnerabilities)
  ├─ Snyk (dependencies)
  ├─ OWASP (component analysis)
  └─ Syft (SBOM)
  ↓
Test (build-and-push.yml)
  ├─ Unit tests
  ├─ Integration tests
  └─ E2E tests
  ↓
Build & Push Image (build-and-push.yml)
  ├─ Docker build
  ├─ Push to GHCR
  └─ Update manifests
  ↓
Integration Tests (integration-tests-kind.yml)
  ├─ Kind cluster deployment
  ├─ Helm validation
  ├─ ServiceMonitor verification
  └─ Resource checks
  ↓
Deploy (deploy-helm.yml) - if KUBECONFIG secret exists
  ├─ Helm upgrade
  ├─ Rollout status
  └─ Smoke tests
  ↓
Notify (Slack)
  └─ Success/Failure
```

## 📈 Monitoring & Alerting Workflow

```
Application Metrics
  ↓
Prometheus Scrape (30s interval)
  ↓
PrometheusRule (alert evaluation)
  ↓
AlertManager
  ├─ Group alerts
  ├─ Deduplicate
  └─ Route to receivers
  ↓
Receivers
  ├─ Slack webhook
  ├─ PagerDuty (critical)
  ├─ Email
  └─ Other integrations
  ↓
On-call Team Notified
```

## 🧪 Testing & Validation

### Local Testing
```bash
# Health endpoint
curl http://localhost:3000/api/health

# Terraform validation
cd terraform
terraform init
terraform validate
terraform plan

# Docker build
docker build -t nextn:test .
docker run --rm nextn:test npm test
```

### Kubernetes Testing
```bash
# Deploy to kind (local cluster)
kind create cluster
helm install nextn chart/nextn -n app --create-namespace

# Verify deployment
kubectl get deployment nextn -n app
kubectl logs deployment/nextn -n app

# Check probes
kubectl exec -it pod/nextn -n app -- \
  curl http://localhost:3000/api/health
```

## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
LOG_LEVEL=info

# Kubernetes
KUBECONFIG=/path/to/config
KUBE_CONTEXT=prod-cluster

# AWS/LocalStack
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***

# Monitoring
SLACK_WEBHOOK=https://hooks.slack.com/...
PAGERDUTY_SERVICE_KEY=***
```

### Terraform Variables

```bash
# Local development (LocalStack)
TF_VAR_use_localstack=true
TF_VAR_localstack_endpoint=http://localhost:4566

# Production (AWS)
TF_VAR_use_localstack=false
TF_VAR_aws_region=us-east-1
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [GITHUB_SECRETS_SETUP.md](docs/GITHUB_SECRETS_SETUP.md) | Configure GitHub Secrets for CD |
| [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | Deployment procedures |
| [SDET_FRAMEWORK.md](docs/SDET_FRAMEWORK.md) | QA automation |
| [SELENIUM_TESTING_GUIDE.md](docs/SELENIUM_TESTING_GUIDE.md) | Browser testing |

## 🚨 Troubleshooting

### Health Check Failures
```bash
# Check if endpoint exists
kubectl exec -it pod/nextn -n app -- \
  wget -O- http://localhost:3000/api/health

# Check logs for errors
kubectl logs pod/nextn -n app -f

# Check resource constraints
kubectl describe pod/nextn -n app
```

### Deployment Issues
```bash
# Check Helm release
helm list -n app
helm status nextn -n app

# Check events
kubectl get events -n app --sort-by='.lastTimestamp'

# Rollback if needed
helm rollback nextn -n app
```

### Monitoring Issues
```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090/targets

# Check AlertManager
# Visit AlertManager UI for alert status
```

## 📞 Support & Escalation

1. **Check Logs**
   - Application logs: `kubectl logs deployment/nextn -n app`
   - Kubernetes events: `kubectl get events -n app`

2. **Verify Health**
   - Health endpoint: `curl /api/health`
   - Prometheus metrics: Check dashboards
   - Pod status: `kubectl describe pod`

3. **Escalate**
   - Critical: PagerDuty (configured in AlertManager)
   - Warning: Slack #alerts
   - Info: Grafana dashboard

## 🔄 Maintenance Schedule

- **Daily**: Monitor dashboards, check alerts
- **Weekly**: Review logs, update dependencies
- **Monthly**: Capacity planning, security review
- **Quarterly**: DR drill, performance optimization, security audit

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Health endpoint tested
- [ ] All GitHub Secrets configured
- [ ] Kubernetes cluster ready
- [ ] Terraform validated
- [ ] Image scanned for vulnerabilities
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Monitoring configured
- [ ] AlertManager configured
- [ ] Runbook documented
- [ ] On-call schedule set
- [ ] Rollback procedure tested

---

**Last Updated**: May 2026
**Version**: 1.0.0
**Maintained by**: Infrastructure Team
