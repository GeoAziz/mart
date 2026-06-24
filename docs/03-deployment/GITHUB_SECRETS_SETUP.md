# GitHub Secrets & Deployment Configuration

This document outlines all required GitHub Secrets and deployment configuration for production deployment.

## Required GitHub Secrets

### Kubernetes & Cluster Access

| Secret | Value | Purpose |
|--------|-------|---------|
| `KUBECONFIG` | Base64-encoded kubeconfig | Cluster authentication for kubectl/Helm |
| `KUBE_CONTEXT` | Context name (e.g., `prod-cluster`) | Which cluster context to use |
| `KUBE_NAMESPACE` | Namespace (default: `app`) | Deployment namespace |

**Setup:**
```bash
# Encode kubeconfig
cat ~/.kube/config | base64 > kubeconfig.b64

# Add to GitHub Secrets as KUBECONFIG
# Content of kubeconfig.b64
```

### Container Registry

| Secret | Value | Purpose |
|--------|-------|---------|
| `REGISTRY_USERNAME` | GitHub username | GHCR authentication |
| `REGISTRY_PASSWORD` | GitHub token (PAT) | GHCR access token |
| `REGISTRY_URL` | `ghcr.io` | Container registry URL |

**Setup:**
```bash
# Create GitHub Personal Access Token (PAT) with:
# - read:packages
# - write:packages
# - delete:packages

# Add to GitHub Secrets
```

### Cloud Provider Credentials

| Secret | Value | Purpose |
|--------|-------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS API authentication |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS API authentication |
| `AWS_REGION` | `us-east-1` | Default AWS region |

### GitHub OIDC Repository Variables

Set these as repository or environment variables for the deploy and bootstrap workflows:

| Variable | Value | Purpose |
|----------|-------|---------|
| `AWS_ROLE_TO_ASSUME` | IAM role ARN trusted by GitHub OIDC | Temporary AWS credentials for EKS and Terraform bootstrap |
| `EKS_CLUSTER_NAME` | EKS cluster name | Target cluster for `aws eks update-kubeconfig` |
| `KUBE_NAMESPACE` | Kubernetes namespace | Helm release namespace |
| `PRODUCTION_HOST` | Public production hostname | Ingress host for production deploys |
| `STAGING_HOST` | Staging hostname | Ingress host for staging deploys |
| `CERT_MANAGER_ISSUER` | `letsencrypt-prod` or `letsencrypt-staging` | TLS issuer used by Helm values |

Use secrets for credentials and webhooks. Use variables for non-sensitive deploy values.

**Setup:**
```bash
# Create IAM user with policies:
# - AmazonS3FullAccess
# - AmazonDynamoDBFullAccess
# - AmazonEC2FullAccess (for production)

# Add credentials to GitHub Secrets
```

### Monitoring & Alerting

| Secret | Value | Purpose |
|--------|-------|---------|
| `SLACK_WEBHOOK` | Slack webhook URL | Slack notifications for alerts |
| `PAGERDUTY_SERVICE_KEY` | PagerDuty service key | PagerDuty incident creation |

**Setup - Slack:**
```bash
# Create incoming webhook in Slack
# https://api.slack.com/apps → Create New App → Incoming Webhooks
# Add to GitHub Secrets as SLACK_WEBHOOK
```

**Setup - PagerDuty:**
```bash
# PagerDuty → Services → Select service → Integrations
# Add new integration: Events API v2
# Copy Integration Key to GitHub Secrets as PAGERDUTY_SERVICE_KEY
```

### Security Scanning

| Secret | Value | Purpose |
|--------|-------|---------|
| `SNYK_TOKEN` | Snyk API token | Dependency vulnerability scanning |
| `TRIVY_DB_TOKEN` | Trivy DB token (optional) | Enhanced Trivy scanning |

**Setup - Snyk:**
```bash
# Sign up: https://app.snyk.io
# Settings → API → Show API token
# Add to GitHub Secrets as SNYK_TOKEN
```

### Secrets Encryption

| Secret | Value | Purpose |
|--------|-------|---------|
| `VAULT_ADDR` | Vault server URL | HashiCorp Vault access |
| `VAULT_TOKEN` | Vault access token | Vault authentication |
| `SEALED_SECRETS_KEY` | Sealed Secrets private key | Kubernetes secret encryption |

**Setup - Sealed Secrets:**
```bash
# Generate key on cluster
kubectl create secret generic \
  --from-literal=tls.crt=$(cat sealing-key.crt) \
  --from-literal=tls.key=$(cat sealing-key.key) \
  sealed-secrets-key \
  -n kube-system

# Add keys to GitHub Secrets
```

## Environment Variables (Non-Secret)

Add these to `.github/workflows/*.yml`:

```yaml
env:
  NODE_ENV: production
  REGISTRY: ghcr.io
  IMAGE_REPO: ${{ github.repository_owner }}/nextn
  HELM_REPO: https://helm.nextn.io
  TERRAFORM_VERSION: 1.6.0
  KUBERNETES_VERSION: 1.28
  AWS_ROLE_TO_ASSUME: ${{ vars.AWS_ROLE_TO_ASSUME }}
  EKS_CLUSTER_NAME: ${{ vars.EKS_CLUSTER_NAME }}
  KUBE_NAMESPACE: ${{ vars.KUBE_NAMESPACE || 'app' }}
  CERT_MANAGER_ISSUER: ${{ vars.CERT_MANAGER_ISSUER || 'letsencrypt-prod' }}
```

## Workflow Configuration

### Deploy Workflow Template

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Require approval
    
    steps:
      - uses: actions/checkout@v4
      
      # 1. Build & Push Image
      - name: Login to GHCR
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/${{ github.repository }}:${{ github.sha }}
            ${{ secrets.REGISTRY_URL }}/${{ github.repository }}:latest
      
      # 2. Configure Kubernetes
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config
          kubectl config use-context ${{ secrets.KUBE_CONTEXT }}

      # Or, if you are using GitHub OIDC, set AWS_ROLE_TO_ASSUME and EKS_CLUSTER_NAME
      # as repository or environment variables and omit KUBECONFIG entirely.
      
      # 3. Deploy with Helm
      - name: Deploy via Helm
        run: |
          helm repo add myrepo ${{ env.HELM_REPO }}
          helm repo update
          helm upgrade --install nextn myrepo/nextn \
            --namespace ${{ secrets.KUBE_NAMESPACE }} \
            --set image.repository=${{ secrets.REGISTRY_URL }}/nextn \
            --set image.tag=${{ github.sha }}
      
      # 4. Verify Deployment
      - name: Verify rollout
        run: |
          kubectl rollout status deployment/nextn \
            -n ${{ secrets.KUBE_NAMESPACE }} \
            --timeout=5m
      
      - name: Smoke test
        run: |
          kubectl run smoke-test \
            --image=curlimages/curl \
            --rm \
            -it \
            --restart=Never \
            -- curl http://nextn/api/health
      
      # 5. Notify
      - name: Notify deployment
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployment successful",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "Deployed to production by ${{ github.actor }}"
                }
              }]
            }
```

## Production Secrets Setup Checklist

- [ ] **Kubernetes Access**
  - [ ] KUBECONFIG added
  - [ ] KUBE_CONTEXT verified
  - [ ] Test: `kubectl get nodes`
  - [ ] OR AWS_ROLE_TO_ASSUME + EKS_CLUSTER_NAME + KUBE_NAMESPACE added as repository/environment variables

- [ ] **Container Registry**
  - [ ] REGISTRY_USERNAME & PASSWORD added
  - [ ] Test: `docker login ghcr.io`

- [ ] **AWS (if using)**
  - [ ] AWS_ACCESS_KEY_ID added
  - [ ] AWS_SECRET_ACCESS_KEY added
  - [ ] Test: `aws s3 ls`
  - [ ] OR GitHub OIDC configured so no long-lived AWS deploy keys are needed

- [ ] **Monitoring**
  - [ ] SLACK_WEBHOOK added
  - [ ] PAGERDUTY_SERVICE_KEY added
  - [ ] Test: Send test alert

- [ ] **Security Scanning**
  - [ ] SNYK_TOKEN added
  - [ ] Test: `snyk test`

- [ ] **Environments**
  - [ ] Create "production" environment in GitHub
  - [ ] Set protection rules (require approval)
  - [ ] Add required reviewers

## Local Development

For local testing with similar secrets:

```bash
# Create .env.local
cat > .env.local <<EOF
KUBECONFIG=$HOME/.kube/config
REGISTRY_URL=ghcr.io
REGISTRY_USERNAME=$(gh auth status --show-token)
AWS_REGION=us-east-1
NODE_ENV=development
EOF

# Source before running tests
source .env.local
```

## Rotations & Maintenance

### Weekly
- Monitor GitHub secret audit logs
- Check for failed deployments due to expired secrets

### Monthly
- Rotate PAT tokens (regenerate REGISTRY_PASSWORD)
- Review Snyk token access
- Audit Slack webhook usage

### Quarterly
- Rotate AWS credentials
- Refresh kubeconfig if using short-lived tokens
- Update PagerDuty service keys

## Troubleshooting

### Kubeconfig Issues
```bash
# Verify kubeconfig format
base64 -d <<< "$KUBECONFIG_SECRET" | kubectl config view

# Test connection
kubectl config use-context your-context
kubectl get nodes
```

### GHCR Login Issues
```bash
# Create PAT with correct scopes
gh auth token | docker login ghcr.io -u USERNAME --password-stdin
```

### AWS Credentials Issues
```bash
# Verify credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam get-user
```

## Security Best Practices

1. **Rotate secrets regularly** - Set calendar reminders for quarterly rotations
2. **Use GitHub Environments** - Require approval for production deployments
3. **Minimal permissions** - Use least-privilege IAM policies
4. **Audit logs** - Monitor GitHub secret access and API usage
5. **Sealed Secrets** - Store Kubernetes secrets encrypted in Git
6. **Secret scanning** - Enable GitHub's secret scanning feature

## References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Kubernetes Kubeconfig](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Docker Registry Authentication](https://docs.docker.com/docker-hub/access-tokens/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
