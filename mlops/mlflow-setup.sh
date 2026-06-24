#!/bin/bash
# MLflow Setup & Initialization Script
# Deploys MLflow server for model registry and tracking

set -e

echo "🚀 MLOps Setup: Initializing MLflow Server"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
MLFLOW_PORT=${MLFLOW_PORT:-5000}
MLFLOW_BACKEND=${MLFLOW_BACKEND:-"./mlflow_backend"}
MLFLOW_ARTIFACTS=${MLFLOW_ARTIFACTS:-"./mlflow_artifacts"}

# Step 1: Create directories
echo -e "${BLUE}Step 1: Creating MLflow directories...${NC}"
mkdir -p "$MLFLOW_BACKEND"
mkdir -p "$MLFLOW_ARTIFACTS"
echo -e "${GREEN}✓ Directories created${NC}"

# Step 2: Check Python
echo -e "${BLUE}Step 2: Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠ Python3 not found. Installing...${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Found $PYTHON_VERSION${NC}"

# Step 3: Create virtual environment (optional but recommended)
echo -e "${BLUE}Step 3: Setting up Python environment...${NC}"
if [ ! -d "mlops_venv" ]; then
    python3 -m venv mlops_venv
    source mlops_venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    source mlops_venv/bin/activate
    echo -e "${GREEN}✓ Using existing virtual environment${NC}"
fi

# Step 4: Install MLflow and dependencies
echo -e "${BLUE}Step 4: Installing MLflow and dependencies...${NC}"
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install mlflow==2.8.0 > /dev/null 2>&1
pip install numpy scipy scikit-learn pandas > /dev/null 2>&1
pip install tensorflow==2.13.0 > /dev/null 2>&1
pip install fastapi uvicorn > /dev/null 2>&1
pip install prometheus-client > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Initialize MLflow tracking server
echo -e "${BLUE}Step 5: Initializing MLflow tracking server...${NC}"
cat > mlflow-server.sh << 'EOF'
#!/bin/bash
source mlops_venv/bin/activate
mlflow server \
    --backend-store-uri sqlite:///./mlflow_backend/mlflow.db \
    --default-artifact-root ./mlflow_artifacts \
    --host 0.0.0.0 \
    --port 5000
EOF

chmod +x mlflow-server.sh
echo -e "${GREEN}✓ MLflow server script created${NC}"

# Step 6: Create example model registry structure
echo -e "${BLUE}Step 6: Creating model registry structure...${NC}"
mkdir -p mlops/models/{sales_predictor,demand_forecast,fraud_detector}
mkdir -p mlops/training/data
mkdir -p mlops/monitoring

# Create example MLmodel file
cat > mlops/models/sales_predictor/MLmodel << 'EOF'
artifact_path: models/sales_predictor
flavors:
  tensorflow:
    data: model
    keras_model: model.keras
  python_function:
    data: model
    env: conda.yaml
    loader_module: mlflow.tensorflow
    python_version: '3.10'
model_uuid: sales-predictor-v1
utc_time_created: '2026-05-20T00:00:00Z'
version: 1
EOF

echo -e "${GREEN}✓ Model registry structure created${NC}"

# Step 7: Create conda environment for tracking
echo -e "${BLUE}Step 7: Creating MLflow conda environment...${NC}"
cat > mlops/models/sales_predictor/conda.yaml << 'EOF'
name: mlflow-sales-predictor
channels:
  - conda-forge
dependencies:
  - python=3.10
  - pip
  - pip:
    - tensorflow==2.13.0
    - numpy==1.24.0
    - scikit-learn==1.3.0
EOF

echo -e "${GREEN}✓ Conda environment created${NC}"

# Step 8: Display next steps
echo ""
echo -e "${GREEN}✅ MLflow Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📍 Next Steps:${NC}"
echo "1. Start MLflow server:"
echo "   ./mlflow-server.sh"
echo ""
echo "2. MLflow UI will be available at: http://localhost:5000"
echo "3. Model artifacts are stored in: $MLFLOW_ARTIFACTS"
echo "4. Database backend: $MLFLOW_BACKEND/mlflow.db"
echo ""
echo "2. Access MLflow UI:"
echo "   http://localhost:5000"
echo ""
echo "3. Set MLflow tracking URI in your training code:"
echo "   mlflow.set_tracking_uri('http://localhost:5000')"
echo ""
echo "4. See MLOPS_IMPLEMENTATION_GUIDE.md for detailed steps"
echo ""

# Optional: Start server if requested
if [ "$1" == "--start" ]; then
    echo -e "${BLUE}Starting MLflow server...${NC}"
    ./mlflow-server.sh
fi
