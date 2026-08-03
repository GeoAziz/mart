#!/bin/bash
# k3s Master Node Initialization
# Sets up k3s control plane

set -e

# Logging
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/k3s-init.log
}

log "Starting k3s master initialization..."

# Update system
apt-get update
apt-get upgrade -y
apt-get install -y curl wget vim htop net-tools

# Configure sysctl for k8s
cat >> /etc/sysctl.conf << EOF
vm.overcommit_memory = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sysctl -p

# Install k3s master
log "Installing k3s ${k3s_version}..."

export INSTALL_K3S_VERSION="${k3s_version}"
export K3S_KUBECONFIG_MODE="644"
export K3S_TOKEN="zilamart-$(openssl rand -base64 32)"

# Save token for workers
echo "$K3S_TOKEN" > /tmp/k3s-token
chmod 644 /tmp/k3s-token

curl -sfL https://get.k3s.io | sh -

# Wait for k3s to be ready
log "Waiting for k3s to be ready..."
for i in {1..60}; do
  if k3s kubectl get nodes &>/dev/null; then
    log "k3s is ready"
    break
  fi
  sleep 5
done

# Copy kubeconfig
mkdir -p /root/.kube
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
chmod 600 /root/.kube/config

# Install metrics-server
log "Installing metrics-server..."
k3s kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install Helm
log "Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Create zilamart namespace
log "Creating namespace..."
k3s kubectl create namespace zilamart
k3s kubectl label namespace zilamart name=zilamart

# Install Nginx Ingress
log "Installing Nginx Ingress Controller..."
k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install Cert-Manager
log "Installing Cert-Manager..."
k3s kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml

# Install Prometheus stack
log "Installing Prometheus stack..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values - << 'EOF'
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 20Gi

grafana:
  adminPassword: ${admin_password}
  persistence:
    enabled: true
    size: 5Gi
EOF

# Save k3s token and config for workers
log "Saving configuration for workers..."
cat > /tmp/k3s-config << EOF
K3S_URL="https://$(hostname -I | awk '{print $1}'):6443"
K3S_TOKEN="$K3S_TOKEN"
K3S_VERSION="${k3s_version}"
EOF

# Setup logging
cat > /etc/logrotate.d/k3s << 'EOF'
/var/log/k3s*.log {
    rotate 7
    daily
    compress
    delaycompress
    missingok
    notifempty
}
EOF

log "k3s master initialization complete!"
log "Node IP: $(hostname -I | awk '{print $1}')"
log "Kubeconfig: /etc/rancher/k3s/k3s.yaml"
