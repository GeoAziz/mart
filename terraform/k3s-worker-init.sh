#!/bin/bash
# k3s Worker Node Initialization
# Joins the k3s cluster as a worker

set -e

# Logging
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/k3s-init.log
}

log "Starting k3s worker initialization (node ${node_index})..."

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

# Wait for master to be ready
log "Waiting for master node to be ready..."
for i in {1..120}; do
  if curl -k https://${master_ip}:6443/healthz 2>/dev/null; then
    log "Master node is ready"
    break
  fi
  if [ $i -eq 120 ]; then
    log "ERROR: Master node did not become ready"
    exit 1
  fi
  sleep 5
done

# Install k3s agent (worker)
log "Installing k3s agent ${k3s_version}..."

export INSTALL_K3S_VERSION="${k3s_version}"
export K3S_URL="https://${master_ip}:6443"
export K3S_TOKEN="$(ssh -o StrictHostKeyChecking=no ubuntu@${master_ip} cat /tmp/k3s-token)"

curl -sfL https://get.k3s.io | K3S_URL=$K3S_URL K3S_TOKEN=$K3S_TOKEN sh -

# Wait for agent to be ready
log "Waiting for k3s agent to be ready..."
for i in {1..60}; do
  if systemctl is-active --quiet k3s-agent; then
    log "k3s agent is ready"
    break
  fi
  if [ $i -eq 60 ]; then
    log "ERROR: k3s agent did not become ready"
    exit 1
  fi
  sleep 5
done

# Add labels to node
log "Labeling worker node..."
NODE_NAME=$(hostname)
sleep 10  # Wait for node to register

kubectl label node $NODE_NAME \
  node-role.kubernetes.io/worker=worker \
  workload-type=general \
  --kubeconfig=/etc/rancher/k3s/k3s.yaml || true

log "k3s worker (${node_index}) initialization complete!"
log "Node IP: $(hostname -I | awk '{print $1}')"
log "Master: ${master_ip}"
