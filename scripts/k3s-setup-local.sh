#!/bin/bash
# k3s Local Cluster Setup
# Install k3s single-node cluster and deploy Helm chart

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            k3s Local Cluster Setup                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if k3s is already installed
if command -v k3s &> /dev/null; then
    echo -e "${GREEN}✓ k3s already installed${NC}"
    k3s --version
else
    echo -e "${YELLOW}Installing k3s...${NC}"
    curl -sfL https://get.k3s.io | sh -

    # Wait for k3s to be ready
    echo -e "${YELLOW}Waiting for k3s to be ready...${NC}"
    sleep 10
fi

# Set up kubeconfig
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo chmod 644 /etc/rancher/k3s/k3s.yaml

echo -e "${GREEN}✓ k3s cluster ready${NC}"

# Check kubectl
echo -e "\n${YELLOW}Checking kubectl...${NC}"
kubectl version --short

# Wait for nodes
echo -e "\n${YELLOW}Waiting for nodes to be ready...${NC}"
kubectl wait --for=condition=Ready node --all --timeout=300s || true

# Check node status
echo -e "\n${YELLOW}Node status:${NC}"
kubectl get nodes -o wide

# Install Helm if not present
if ! command -v helm &> /dev/null; then
    echo -e "\n${YELLOW}Installing Helm...${NC}"
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

echo -e "${GREEN}✓ Helm installed${NC}"
helm version

# Create namespace
echo -e "\n${YELLOW}Creating namespace...${NC}"
kubectl create namespace zilamart --dry-run=client -o yaml | kubectl apply -f -

# Label namespace for monitoring
kubectl label namespace zilamart name=zilamart --overwrite

# Install Nginx Ingress Controller
echo -e "\n${YELLOW}Installing Nginx Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s

# Install Cert-Manager (optional, for TLS)
echo -e "\n${YELLOW}Installing Cert-Manager...${NC}"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml
kubectl wait --namespace cert-manager --for=condition=ready pod --selector=app.kubernetes.io/instance=cert-manager --timeout=120s || true

# Add local Docker registry (k3s uses containerd)
echo -e "\n${YELLOW}Configuring container registry...${NC}"
mkdir -p /etc/rancher/k3s
cat > /tmp/registries.yaml << 'REGISTRIES_EOF'
mirrors:
  docker.io:
    endpoint:
      - "https://registry-1.docker.io"
  localhost:5000:
    endpoint:
      - "http://localhost:5000"
REGISTRIES_EOF

sudo cp /tmp/registries.yaml /etc/rancher/k3s/registries.yaml
sudo systemctl restart k3s

# Build and load local image
echo -e "\n${YELLOW}Building Docker image...${NC}"
docker build -t mart-app:latest .

# Import image to k3s
echo -e "\n${YELLOW}Importing image to k3s...${NC}"
docker save mart-app:latest | sudo k3s ctr images import -

# Deploy using Helm
echo -e "\n${YELLOW}Deploying application with Helm...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Redis
echo -e "\n${YELLOW}Installing Redis...${NC}"
helm install redis bitnami/redis \
  --namespace zilamart \
  --set architecture=standalone \
  --set auth.enabled=false \
  --set persistence.enabled=false \
  --wait

# Deploy app
echo -e "\n${YELLOW}Deploying ZilaCart app...${NC}"
helm upgrade --install mart ./chart \
  --namespace zilamart \
  --values chart/values-dev.yaml \
  --wait

# Configure local DNS
echo -e "\n${YELLOW}Setting up local DNS...${NC}"
echo "127.0.0.1 zilamart.local" | sudo tee -a /etc/hosts > /dev/null

# Get service info
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Service Information:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Pods:${NC}"
kubectl get pods -n zilamart

echo -e "\n${YELLOW}Services:${NC}"
kubectl get svc -n zilamart

echo -e "\n${YELLOW}Ingress:${NC}"
kubectl get ingress -n zilamart

# Port forwarding instructions
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Access URLs:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}App (port-forward):${NC}"
echo "kubectl port-forward -n zilamart svc/mart 3000:80"
echo "Then access: ${BLUE}http://localhost:3000${NC}"

echo -e "\n${YELLOW}Grafana (port-forward):${NC}"
echo "kubectl port-forward -n zilamart svc/mart-grafana 3001:80"
echo "Then access: ${BLUE}http://localhost:3001${NC} (admin/admin)"

echo -e "\n${YELLOW}Prometheus (port-forward):${NC}"
echo "kubectl port-forward -n zilamart svc/mart-prometheus 9090:9090"
echo "Then access: ${BLUE}http://localhost:9090${NC}"

echo -e "\n${YELLOW}Or via Ingress:${NC}"
echo "Add to /etc/hosts: ${BLUE}127.0.0.1 zilamart.local${NC}"
echo "Then access: ${BLUE}http://zilamart.local${NC}"

# Useful commands
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo -e "View logs: ${YELLOW}kubectl logs -n zilamart -f deployment/mart${NC}"
echo -e "Get shell: ${YELLOW}kubectl exec -it -n zilamart deployment/mart -- sh${NC}"
echo -e "View events: ${YELLOW}kubectl get events -n zilamart${NC}"
echo -e "Describe pod: ${YELLOW}kubectl describe pod -n zilamart <pod-name>${NC}"
echo ""
echo -e "Helm status: ${YELLOW}helm status mart -n zilamart${NC}"
echo -e "Helm values: ${YELLOW}helm get values mart -n zilamart${NC}"
echo -e "Helm upgrade: ${YELLOW}helm upgrade mart ./chart -n zilamart -f chart/values-dev.yaml${NC}"
echo ""
echo -e "Delete cluster: ${YELLOW}sudo k3s-uninstall.sh${NC}"
echo ""

echo -e "${GREEN}✅ k3s cluster ready for development!${NC}"
