# Kubernetes Deployment Guide (k3s + Helm + EKS)

**Status:** Complete k3s stack ready  
**Components:** Local k3s, Staging k3s, Production EKS  
**Updated:** 2026-06-24

---

## Quick Start

### Local Development (k3s single-node)

```bash
# One command setup
chmod +x scripts/k3s-setup-local.sh
./scripts/k3s-setup-local.sh

# This installs:
# ✓ k3s cluster (single node)
# ✓ Helm package manager
# ✓ Nginx Ingress Controller
# ✓ Cert-Manager
# ✓ Prometheus + Grafana
# ✓ Redis
# ✓ Your app from Helm chart
```

### Access Local Cluster

```bash
# Port forward to services
kubectl port-forward -n zilamart svc/mart 3000:80

# Or use Ingress
echo "127.0.0.1 zilamart.local" | sudo tee -a /etc/hosts
# Then: http://zilamart.local
```

---

## Architecture

### Three-Tier Deployment

```
┌─────────────────────────────────────────────────────┐
│              DEVELOPMENT                            │
│  k3s single-node (laptop/VM)                        │
│  ✓ Fast iteration                                   │
│  ✓ Docker Compose compatible                        │
│  ✓ Full k8s features                                │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              STAGING                                │
│  k3s 3-node cluster (AWS)                           │
│  ✓ Multi-node k8s testing                           │
│  ✓ Production-like configs                          │
│  ✓ Load balancer testing                            │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              PRODUCTION                             │
│  AWS EKS managed cluster                            │
│  ✓ Auto-scaling                                     │
│  ✓ Managed control plane                            │
│  ✓ High availability                                │
└─────────────────────────────────────────────────────┘
```

---

## Local Development (k3s)

### Requirements

- Docker installed
- At least 4GB RAM
- 10GB disk space
- Linux or macOS (or WSL2 on Windows)

### Step 1: Install k3s

```bash
curl -sfL https://get.k3s.io | sh -
```

### Step 2: Verify k3s

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
# Should show: k3s-<hostname> Ready

kubectl get pod -A
# Should show: system pods running
```

### Step 3: Deploy with Helm

```bash
# Build Docker image
docker build -t mart-app:latest .

# Import to k3s
docker save mart-app:latest | sudo k3s ctr images import -

# Deploy
helm install mart ./chart \
  --namespace zilamart \
  --create-namespace \
  --values chart/values-dev.yaml \
  --wait

# Verify
kubectl get pods -n zilamart
kubectl get svc -n zilamart
```

### Step 4: Access Services

```bash
# App (port-forward)
kubectl port-forward -n zilamart svc/mart 3000:80
# Then: http://localhost:3000

# Grafana
kubectl port-forward -n zilamart svc/mart-grafana 3001:80
# Then: http://localhost:3001 (admin/admin)

# Prometheus
kubectl port-forward -n zilamart svc/mart-prometheus 9090:9090
# Then: http://localhost:9090
```

### Step 5: Deploy Queue Workers (Optional)

```bash
# Enable workers in values
helm upgrade mart ./chart \
  --namespace zilamart \
  --values chart/values-dev.yaml \
  --set queueWorkers.enabled=true \
  --wait

# Verify workers
kubectl get deployments -n zilamart
kubectl logs -n zilamart -f deployment/mart-queue-orders
```

---

## Staging Deployment (k3s on AWS)

### Prerequisites

- AWS account with Terraform configured
- EC2 key pair created
- Appropriate IAM permissions

### Step 1: Enable k3s Staging

Edit `terraform/terraform.tfvars`:

```hcl
environment       = "staging"
enable_k3s_staging = true
k3s_node_count    = 3
k3s_instance_type = "t3.medium"
```

### Step 2: Plan Infrastructure

```bash
cd terraform
terraform plan
# Review changes
```

### Step 3: Deploy k3s Cluster

```bash
terraform apply

# Outputs:
# k3s_master_public_ip = 54.123.45.67
# k3s_alb_endpoint = k3s-staging-1234567.us-east-1.elb.amazonaws.com
```

### Step 4: Get Kubeconfig

```bash
# From Terraform output
scp -i ~/.ssh/id_rsa ubuntu@<k3s-master-ip>:/etc/rancher/k3s/k3s.yaml \
  ~/.kube/k3s-staging-config

export KUBECONFIG=~/.kube/k3s-staging-config

# Verify
kubectl get nodes
```

### Step 5: Deploy App

```bash
# Push image to ECR
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

aws ecr create-repository --repository-name mart-app --region $AWS_REGION || true

docker build -t mart-app:staging .
docker tag mart-app:staging $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mart-app:staging
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mart-app:staging

# Deploy
helm install mart ./chart \
  --namespace zilamart \
  --create-namespace \
  --values chart/values-staging.yaml \
  --set image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mart-app \
  --wait
```

### Step 6: Access Staging

```bash
# Via ALB
kubectl get ingress -n zilamart
# Use the ALB endpoint from Terraform output

# Or port-forward
kubectl port-forward -n zilamart svc/mart 3000:80
```

---

## Production Deployment (AWS EKS)

### Prerequisites

- EKS cluster already provisioned (Terraform)
- ECR repository created
- Production image built and pushed

### Step 1: Get Production Kubeconfig

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name nextn-prod
```

### Step 2: Deploy App

```bash
export KUBECONFIG=~/.kube/config  # or production context

helm install mart ./chart \
  --namespace zilamart \
  --create-namespace \
  --values chart/values-prod.yaml \
  --set image.tag=$(git describe --tags --always)
```

### Step 3: Verify Deployment

```bash
kubectl get pods -n zilamart
kubectl get svc -n zilamart
kubectl get ingress -n zilamart

# Watch rollout
kubectl rollout status deployment/mart -n zilamart
```

### Step 4: Monitor

```bash
# Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Logs
kubectl logs -n zilamart -f deployment/mart
```

---

## Helm Commands

### Useful Operations

```bash
# Install
helm install mart ./chart -n zilamart -f values-dev.yaml

# Upgrade
helm upgrade mart ./chart -n zilamart -f values-dev.yaml

# Rollback
helm rollback mart -n zilamart

# List releases
helm list -n zilamart

# Get values
helm get values mart -n zilamart

# Check status
helm status mart -n zilamart

# Test chart
helm lint ./chart
helm template mart ./chart -f values-dev.yaml

# Uninstall
helm uninstall mart -n zilamart
```

---

## Kubernetes Commands

### Pod Management

```bash
# Get pods
kubectl get pods -n zilamart
kubectl get pods -n zilamart -w  # Watch

# Pod details
kubectl describe pod <pod-name> -n zilamart
kubectl logs <pod-name> -n zilamart
kubectl logs <pod-name> -n zilamart -f  # Follow

# Execute command
kubectl exec -it <pod-name> -n zilamart -- /bin/sh

# Port forward
kubectl port-forward pod/<pod-name> 3000:3000 -n zilamart
```

### Deployments

```bash
# List deployments
kubectl get deployments -n zilamart

# Deployment info
kubectl describe deployment mart -n zilamart

# Scale deployment
kubectl scale deployment mart --replicas=3 -n zilamart

# Rollout status
kubectl rollout status deployment/mart -n zilamart

# Rollout history
kubectl rollout history deployment/mart -n zilamart

# Rollback
kubectl rollout undo deployment/mart -n zilamart
```

### Services & Ingress

```bash
# Services
kubectl get svc -n zilamart

# Ingress
kubectl get ingress -n zilamart
kubectl describe ingress mart-ingress -n zilamart

# Port forward service
kubectl port-forward svc/mart 3000:80 -n zilamart
```

### Monitoring

```bash
# Node status
kubectl get nodes
kubectl describe node <node-name>

# Resource usage
kubectl top nodes
kubectl top pods -n zilamart

# Events
kubectl get events -n zilamart
```

---

## Troubleshooting

### Pod Won't Start

```bash
# Check pod status
kubectl describe pod <pod-name> -n zilamart

# Check logs
kubectl logs <pod-name> -n zilamart
kubectl logs <pod-name> -n zilamart --previous  # Previous container

# Check resource usage
kubectl top pods -n zilamart
```

### Can't Connect to Service

```bash
# Check service
kubectl get svc <service-name> -n zilamart

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://mart:80

# Check DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup mart.zilamart.svc.cluster.local
```

### Helm Issues

```bash
# Debug template rendering
helm template mart ./chart -f values-dev.yaml

# Check chart syntax
helm lint ./chart

# Get detailed install output
helm install mart ./chart -n zilamart -f values-dev.yaml --debug
```

---

## Configuration

### Environment-Specific Values

| Environment | File | Replicas | Resources | Features |
|-------------|------|----------|-----------|----------|
| Dev | values-dev.yaml | 1 | 256Mi mem | Emulators, LocalStack |
| Staging | values-staging.yaml | 2 | 512Mi mem | Real AWS, Queue workers |
| Prod | values-prod.yaml | 3 | 1Gi mem | HA, Autoscaling, TLS |

### Customization

```bash
# Override values at install time
helm install mart ./chart -n zilamart \
  --values chart/values-dev.yaml \
  --set replicaCount=2 \
  --set resources.limits.memory=1Gi \
  --set autoscaling.enabled=true
```

---

## Upgrading

### Rolling Upgrade

```bash
# Update chart version
helm upgrade mart ./chart -n zilamart -f values-dev.yaml --wait

# Verify
kubectl rollout status deployment/mart -n zilamart
```

### Rollback Failed Upgrade

```bash
# List previous releases
helm history mart -n zilamart

# Rollback
helm rollback mart 1 -n zilamart  # Rollback to revision 1
```

---

## Next Steps

- [ ] Test local k3s cluster
- [ ] Deploy to staging k3s
- [ ] Run production load tests
- [ ] Set up monitoring alerts
- [ ] Configure CI/CD pipeline
- [ ] Document runbooks
- [ ] Train team on operations

---

## Support

For issues:
1. Check logs: `kubectl logs -n zilamart deployment/mart`
2. Check events: `kubectl get events -n zilamart`
3. Describe pod: `kubectl describe pod <pod-name> -n zilamart`
4. Review DISASTER-RECOVERY.md for incident procedures
