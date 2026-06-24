# Production Deployment Guide

This guide covers deploying the Nextn application to production Kubernetes clusters with full observability, security, and reliability.

## Architecture Overview

```
Internet
  ↓
Ingress Controller (nginx/traefik)
  ↓
Service (LoadBalancer/ClusterIP)
  ↓
Pod (Multi-replica deployment)
  ├─ Container (Nextn app)
  ├─ Health probes (liveness, readiness)
  └─ Resource limits
  ↓
Persistent Data
  ├─ Firestore (managed database)
  ├─ S3/Object Storage
  └─ DynamoDB (state/cache)
  ↓
Observability
  ├─ Prometheus (metrics)
  ├─ Grafana (dashboards)
  ├─ Loki (logs)
  └─ AlertManager (alerting)
```

## Pre-Deployment Checklist

### Infrastructure
- [ ] Kubernetes cluster (1.24+) provisioned
- [ ] Ingress controller installed
- [ ] Prometheus Operator installed
- [ ] Grafana deployed
- [ ] AlertManager configured
- [ ] TLS certificates ready
- [ ] Domain DNS configured

### Secrets & Access
- [ ] Container registry credentials configured
- [ ] Kubeconfig tested
- [ ] AWS/GCP credentials prepared (if using)
- [ ] Slack webhook configured
- [ ] PagerDuty service key configured
- [ ] GitHub Secrets populated (see GITHUB_SECRETS_SETUP.md)

### Application
- [ ] Health endpoint implemented (`/api/health`) ✅
- [ ] Metrics endpoint available (`/api/metrics`)
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] Cache warmup strategy defined

## Deployment Steps

### 1. Build and Push Image

```bash
# Build multi-stage image
docker build \
  -t ghcr.io/YOUR_ORG/nextn:1.0.0 \
  -t ghcr.io/YOUR_ORG/nextn:latest \
  .

# Push to registry
docker push ghcr.io/YOUR_ORG/nextn:1.0.0
docker push ghcr.io/YOUR_ORG/nextn:latest

# Verify image
docker pull ghcr.io/YOUR_ORG/nextn:1.0.0
docker run --rm ghcr.io/YOUR_ORG/nextn:1.0.0 npm -v
```

### 2. Prepare Kubernetes Resources

```bash
# Create namespace
kubectl create namespace app
kubectl label namespace app pod-security.kubernetes.io/enforce=restricted

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL="your-database-url" \
  --from-literal=API_KEY="your-api-key" \
  -n app

# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  --docker-email=your@email.com \
  -n app
```

### 3. Deploy with Helm

```bash
# Add Helm repository (if using external repo)
helm repo add nextn https://charts.example.com/nextn
helm repo update

# Create custom values file
cat > prod-values.yaml <<EOF
replicaCount: 3

image:
  repository: ghcr.io/YOUR_ORG/nextn
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  host: app.example.com
  tls: true

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

prometheus:
  scrape: true
  path: /api/metrics

securityContext:
  enabled: true
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  capabilities:
    drop:
      - ALL

nodeSelector:
  workload: production
EOF

# Deploy
helm upgrade --install nextn chart/nextn \
  -n app \
  --create-namespace \
  -f prod-values.yaml \
  --wait \
  --timeout 10m
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n app
kubectl describe deployment nextn -n app

# Check health endpoint
kubectl port-forward -n app svc/nextn 3000:3000 &
sleep 2
curl -v http://localhost:3000/api/health

# Verify probes
kubectl get pods -n app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")]}{"\n"}{end}'

# Check resource usage
kubectl top pods -n app
kubectl top nodes
```

### 5. Configure Monitoring

```bash
# Apply ServiceMonitor
kubectl apply -f k8s/monitoring-servicemonitor.yaml

# Apply PrometheusRule
kubectl apply -f k8s/prometheus-rules.yaml

# Apply AlertManager config
kubectl apply -f k8s/alertmanager-config.yaml

# Apply Grafana provisioning
kubectl apply -f k8s/grafana-provisioning.yaml

# Verify monitoring
kubectl get servicemonitor -n app
kubectl get prometheusrule -n monitoring
```

### 6. Set Up Ingress

```bash
# Create TLS secret
kubectl create secret tls app-tls \
  --cert=path/to/cert.crt \
  --key=path/to/key.key \
  -n app

# Apply ingress manifest
cat > ingress.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nextn
  namespace: app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nextn
                port:
                  number: 80
EOF

kubectl apply -f ingress.yaml
```

## Post-Deployment Validation

### Application Health

```bash
# Test health endpoint
HEALTH=$(curl -s http://app.example.com/api/health)
echo "Health: $HEALTH"

# Monitor logs
kubectl logs -f deployment/nextn -n app

# Watch deployments
kubectl rollout status deployment/nextn -n app

# Check events
kubectl get events -n app --sort-by='.lastTimestamp'
```

### Observability

```bash
# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Visit http://localhost:3000 (admin / admin)

# Query Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090
# Query: up{job="nextn"}

# Check alerts
# Visit AlertManager UI or check Slack notifications
```

### Performance Baseline

```bash
# Establish baseline metrics
PROMETHEUS_URL="http://prometheus.example.com"

# Query baseline metrics
curl "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total%5B5m%5D)"
curl "$PROMETHEUS_URL/api/v1/query?query=histogram_quantile(0.95,http_request_duration_seconds)"
```

## Rolling Updates

```bash
# Update image
kubectl set image deployment/nextn \
  nextn=ghcr.io/YOUR_ORG/nextn:2.0.0 \
  -n app

# Monitor rollout
kubectl rollout status deployment/nextn -n app --watch

# Rollback if needed
kubectl rollout undo deployment/nextn -n app
kubectl rollout history deployment/nextn -n app
```

## Scaling

### Manual Scaling
```bash
# Scale to 5 replicas
kubectl scale deployment nextn --replicas=5 -n app
```

### Auto-scaling
```bash
# Monitor HPA
kubectl get hpa -n app
kubectl describe hpa nextn -n app

# Metrics Adjustment
# Edit HPA targetCPU or targetMemory
kubectl edit hpa nextn -n app
```

## Backup & Disaster Recovery

### Database Backup
```bash
# Firestore backup (if using)
gcloud firestore export gs://backup-bucket/$(date +%Y%m%d-%H%M%S)

# S3 backup policy
aws s3 cp s3://prod-bucket s3://backup-bucket --recursive
```

### Cluster Backup
```bash
# Velero backup
velero backup create nextn-$(date +%Y%m%d)

# List backups
velero backup get
```

## Troubleshooting

### Pod not starting
```bash
# Check events
kubectl describe pod POD_NAME -n app

# Check logs
kubectl logs POD_NAME -n app

# Check resource limits
kubectl get resourcequotas -n app
```

### High latency
```bash
# Check pod CPU/memory
kubectl top pods -n app

# Check node resources
kubectl top nodes

# Check network policies
kubectl get networkpolicies -n app
```

### Health check failures
```bash
# Debug health endpoint
kubectl exec -it POD_NAME -n app -- \
  curl http://localhost:3000/api/health

# Check dependencies (database, cache)
kubectl exec -it POD_NAME -n app -- npm run healthcheck:deps
```

## Maintenance Tasks

### Daily
- [ ] Monitor Grafana dashboards
- [ ] Review error logs
- [ ] Check alert notifications

### Weekly
- [ ] Review resource usage trends
- [ ] Check for deployment drift
- [ ] Verify backup completion

### Monthly
- [ ] Update dependencies
- [ ] Security scanning report
- [ ] Capacity planning review

### Quarterly
- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Performance optimization

## Rollback Procedure

If deployment goes wrong:

```bash
# Immediate rollback
kubectl rollout undo deployment/nextn -n app

# Verify rollback
kubectl rollout status deployment/nextn -n app

# Check logs
kubectl logs deployment/nextn -n app | tail -100

# Notify team
# Send alert to Slack / PagerDuty
```

## Documentation References

- [Kubernetes Deployment Best Practices](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Prometheus Operator Guide](https://prometheus-operator.dev/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
