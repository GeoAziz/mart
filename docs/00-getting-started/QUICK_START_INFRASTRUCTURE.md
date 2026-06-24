# Production Infrastructure - Quick Start Guide

**Status**: ✅ Complete - All 8 Infrastructure Requirements Implemented  
**Implementation Date**: May 20, 2026

---

## 📋 What Was Implemented

### 1️⃣ Health Endpoint `/api/health`
- **File**: `src/app/api/health/route.ts` ✅ NEW
- **Status**: Returns 200 (healthy) or 503 (degraded)
- **Includes**: Database check, service status, uptime metrics
- **Used by**: Kubernetes liveness/readiness probes, load balancers, monitoring

### 2️⃣ GitHub Secrets & Deployment
- **File**: `docs/GITHUB_SECRETS_SETUP.md` ✅ NEW (Comprehensive guide)
- **Secrets**: KUBECONFIG, GITHUB_TOKEN, AWS credentials, Slack webhook, PagerDuty key
- **Workflows**: Automatically authenticate and deploy when secrets are configured

### 3️⃣ Terraform Remote State Backend
- **Files**: 
  - `terraform/backend.tf` ✅ NEW
  - `terraform/state-backend-setup.tf` ✅ NEW
- **Storage**: S3 bucket + DynamoDB table for production
- **Backup**: Versioning, encryption, access controls

### 4️⃣ Prometheus Monitoring
- **File**: `k8s/monitoring-servicemonitor.yaml` ✅ NEW
- **Auto-discovery**: ServiceMonitor for Prometheus Operator
- **Scraping**: `/api/metrics` every 30 seconds
- **No manual config needed** - Automatic target discovery

### 5️⃣ Grafana Dashboards & Alerts
- **Files**:
  - `k8s/grafana-provisioning.yaml` ✅ NEW (Dashboards)
  - `k8s/prometheus-rules.yaml` ✅ NEW (6 Alert conditions)
  - `k8s/alertmanager-config.yaml` ✅ NEW (Routing)
- **Dashboards**: Application status, request rate, latency, error rate
- **Alerts**: Application down, high errors, high latency, pod restarts, memory/CPU
- **Routing**: Slack + PagerDuty notifications

### 6️⃣ Pod Security & RBAC
- **File**: `k8s/namespace.yaml` + `k8s/rbac.yaml`
- **Enforcement**: Restricted pod security, non-root execution
- **Compliance**: Pod Security Admission labels + ServiceAccount RBAC
- **Access**: ServiceAccount + Role binding

### 7️⃣ Security Scanning (CI/CD)
- **File**: `.github/workflows/security-scanning.yml` ✅ NEW
- **Tools**: Trivy (image), Snyk (dependencies), OWASP, Syft (SBOM)
- **Output**: GitHub Security tab (SARIF format)
- **Enforcement**: Fails on critical vulnerabilities

### 8️⃣ Integration Testing (CI/CD)
- **File**: `.github/workflows/integration-tests-kind.yml` ✅ NEW
- **Kind Cluster**: Validates Helm deployment, ServiceMonitor, Grafana
- **LocalStack**: Tests Terraform with simulated AWS
- **Validation**: Resource checks, health probes, security policies

---

## 🚀 Getting Started

### Step 1: Add GitHub Secrets
Follow `docs/GITHUB_SECRETS_SETUP.md` to add:
- `KUBECONFIG` (your cluster config, base64 encoded)
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`
- `SLACK_WEBHOOK` & `PAGERDUTY_SERVICE_KEY`

### Step 2: Verify Locally
```bash
# Test health endpoint
npm run dev
curl http://localhost:3000/api/health

# Test Dockerfile
docker build -t nextn:test .
docker run --rm nextn:test npm test

# Test Terraform
cd terraform
terraform init
terraform validate
```

### Step 3: Deploy
```bash
# Push to main branch
git push origin main

# GitHub Actions will:
# 1. Build and scan Docker image
# 2. Run tests
# 3. Run integration tests (kind + LocalStack)
# 4. Deploy to Kubernetes (if KUBECONFIG set)
# 5. Notify Slack
```

### Step 4: Monitor
```bash
# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Visit http://localhost:3000 (admin/admin)

# View alerts
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090/alerts
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `docs/GITHUB_SECRETS_SETUP.md` | How to configure GitHub Secrets |
| `docs/PRODUCTION_DEPLOYMENT.md` | Step-by-step production deployment |
| `docs/INFRASTRUCTURE_README.md` | Complete architecture overview |
| `docs/PRODUCTION_READINESS_CHECKLIST.md` | Validation checklist |
| `INFRASTRUCTURE_IMPLEMENTATION_COMPLETE.md` | Detailed implementation summary |
| `IMPLEMENTATION_INDEX.md` | Index of all changes |

---

## 📊 Key Metrics

### Health Check
```
GET /api/health
Response: {
  "status": "healthy|degraded",
  "timestamp": "2026-05-20T...",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "database": "ok",
    "services": {...}
  }
}
```

### Probe Configuration
- **Liveness**: Initial delay 30s, interval 10s, threshold 3
- **Readiness**: Initial delay 10s, interval 5s, threshold 1

### Alert Rules
- ApplicationDown: Pod not responding (critical)
- HighErrorRate: >5% 5xx errors (warning)
- HighLatency: P95 > 1s (warning)
- PodRestarts: >0.5 per 15m (warning)
- HighMemory: >80% limit (warning)
- HighCPU: >80% limit (warning)

### Scan Results
- Docker image: Trivy scan
- Dependencies: Snyk + OWASP
- SBOM: Syft output
- Artifacts: GitHub Security tab

---

## ✅ Pre-Deployment Checklist

- [ ] Health endpoint tested locally
- [ ] Dockerfile builds successfully
- [ ] GitHub Secrets configured
- [ ] Kubernetes cluster accessible
- [ ] Terraform backend ready
- [ ] Monitoring stack deployed
- [ ] Alert notifications configured
- [ ] Integration tests passing
- [ ] Team is trained on procedures

---

## 🆘 Troubleshooting

### Health Endpoint Not Responding
```bash
kubectl logs deployment/nextn -n app
kubectl exec -it pod/nextn -n app -- curl http://localhost:3000/api/health
```

### Metrics Not Appearing
```bash
# Check ServiceMonitor
kubectl get servicemonitor -n app

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090/targets
```

### Alerts Not Firing
```bash
# Check PrometheusRule
kubectl get prometheusrule -n monitoring

# Check AlertManager
kubectl logs -f deployment/alertmanager -n monitoring
```

### Pod Security Violation
```bash
# Check namespace labels
kubectl get ns app -o yaml | grep pod-security

# Describe pod for security context
kubectl describe pod POD_NAME -n app
```

---

## 🔗 Useful Commands

```bash
# View all infrastructure
kubectl apply -f k8s/ --dry-run=client

# Deploy via Helm
helm upgrade --install nextn chart/nextn -n app

# Check deployment status
kubectl get deployment nextn -n app -w

# View pod logs
kubectl logs -f deployment/nextn -n app

# Port forward for local access
kubectl port-forward svc/nextn 3000:80

# Check resource usage
kubectl top pods -n app
kubectl top nodes

# View cluster events
kubectl get events -n app --sort-by='.lastTimestamp'
```

---

## 📞 Support & Escalation

**Critical Alert** → PagerDuty → On-call engineer  
**Warning Alert** → Slack #alerts → Team review  
**Info Alert** → Slack #nextn-alerts → Monitoring dashboard

---

## 🎯 Next Phase

After deploying to production:
1. Monitor dashboards daily
2. Review alerts weekly
3. Update dependencies monthly
4. Conduct DR drill quarterly
5. Rotate secrets every 90 days

---

**Last Updated**: May 20, 2026  
**Status**: ✅ Production Ready  
**Maintained by**: Infrastructure Team
