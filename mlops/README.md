# MLOps Directory Structure & Files

## Overview
This directory contains the complete MLOps implementation for ZilaCart, including model serving, training, monitoring, and Kubernetes deployment configurations.

---

## Directory Structure

```
mlops/
├── README.md                          # This file
├── mlflow-setup.sh                    # Initialize MLflow server
├── inference_service.py               # FastAPI model serving layer
├── requirements-mlops.txt             # Python dependencies
│
├── training/                          # Model training pipelines
│   ├── train_demand_forecast.py       # Demand forecasting trainer
│   ├── train_fraud_detector.py        # (Future) Fraud detection trainer
│   ├── train_recommendations.py       # (Future) Recommendations trainer
│   └── training_config.py             # Shared training config
│
├── monitoring/                        # Monitoring & observability
│   ├── drift_detector.py              # Statistical drift detection
│   ├── prometheus.yml                 # Prometheus scrape config
│   ├── alert_rules.yml                # Alert definitions
│   ├── prometheus_metrics.py          # Metric collectors
│   └── grafana/
│       ├── datasources.yml            # Grafana data sources
│       └── dashboards/
│           ├── model-monitoring.json  # (To be created)
│           └── inference-metrics.json # (To be created)
│
├── kubernetes/                        # K8s deployment manifests
│   ├── mlflow-deployment.yaml         # MLflow server
│   ├── inference-deployment.yaml      # Inference service
│   ├── training-cronjob.yaml          # Weekly training scheduler
│   ├── namespace.yaml                 # (To be created)
│   └── helm/                          # (Future Helm charts)
│
└── docker/                            # Container images
    ├── Dockerfile.inference           # Inference service image
    ├── Dockerfile.trainer             # Training pipeline image
    └── Dockerfile.mlflow              # (Alternative MLflow image)

mlops_backend/                         # (Created at runtime)
├── mlflow.db                          # SQLite MLflow database
└── [model versions]

mlops_artifacts/                       # (Created at runtime)
├── demand_forecast/
│   ├── 1/
│   ├── 2/
│   └── 3/
└── [other models]
```

---

## Core Files Description

### Setup & Configuration

#### `mlflow-setup.sh`
**Purpose**: Initialize MLflow infrastructure  
**Usage**: 
```bash
bash mlops/mlflow-setup.sh --start
```
**What it does**:
- Creates MLflow directories
- Installs dependencies
- Sets up virtual environment
- Initializes SQLite backend
- Starts MLflow server

---

### Training Pipeline

#### `training/train_demand_forecast.py`
**Purpose**: Train demand forecasting model  
**Features**:
- Loads 90 days of historical sales data
- Engineers 10 demand-related features
- Trains LSTM neural network
- Evaluates on holdout test set
- Registers to MLflow with metrics
- Tracks training data lineage

**Usage**:
```bash
python mlops/training/train_demand_forecast.py
```

**Key Metrics Tracked**:
- RMSE (Root Mean Square Error)
- MAE (Mean Absolute Error)
- MAPE (Mean Absolute Percentage Error)
- Training samples count
- Test samples count

---

### Serving Layer

#### `inference_service.py`
**Purpose**: FastAPI service for model inference  
**Endpoints**:
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /models` - List all registered models
- `GET /models/{name}` - Get model details
- `POST /predict/demand-forecast` - Demand prediction
- `POST /predict/recommendations` - Get recommendations
- `POST /predict/fraud-score` - Fraud risk scoring
- `POST /models/{name}/promote` - Promote model version

**Features**:
- Model caching for fast inference
- Metrics collection for all predictions
- Error tracking and logging
- Latency measurement
- Request validation

**Requirements**:
- Python 3.10+
- MLflow server running
- Firebase (optional, for data)
- TensorFlow 2.13+

---

### Monitoring

#### `monitoring/drift_detector.py`
**Purpose**: Detect data and model drift  
**Classes**:
- `DataDriftDetector` - Statistical distribution change detection
- `ModelDriftDetector` - Performance degradation detection
- `ModelPerformanceMonitor` - Track prediction metrics
- `AlertGenerator` - Generate alerts

**Drift Detection Methods**:
- Kolmogorov-Smirnov test
- Wasserstein distance
- KL divergence

**Alert Levels**:
- NO_DRIFT: < 50% threshold
- LOW_DRIFT: 50-100% threshold
- MODERATE_DRIFT: 100-200% threshold
- HIGH_DRIFT: > 200% threshold

#### `monitoring/prometheus.yml`
**Purpose**: Prometheus scrape configuration  
**Scrape Targets**:
- prometheus:9090 (self)
- mlops-inference:8001 (API metrics)
- mlflow:5000 (registry events)

#### `monitoring/alert_rules.yml`
**Purpose**: Alert definitions  
**Alert Categories**:
- Inference latency alerts
- Error rate alerts
- Data drift alerts
- Model performance alerts
- Training pipeline alerts
- Service availability alerts

---

### Docker Images

#### `docker/Dockerfile.inference`
**Purpose**: Container image for inference service  
**Base**: `python:3.10-slim`  
**Exposes**: Port 8001  
**Healthcheck**: HTTP `/health`

#### `docker/Dockerfile.trainer`
**Purpose**: Container image for training pipeline  
**Base**: `python:3.10-slim`  
**Runtime**: ~10 minutes per training job  
**Environment**: Requires Firebase credentials

---

### Kubernetes Manifests

#### `kubernetes/mlflow-deployment.yaml`
**Components**:
- Deployment (1 replica)
- Service (ClusterIP)
- PersistentVolumeClaims (10GB backend, 100GB artifacts)
- Liveness/readiness probes

#### `kubernetes/inference-deployment.yaml`
**Components**:
- Deployment (2-10 replicas via HPA)
- Service (ClusterIP)
- HorizontalPodAutoscaler (CPU/memory-based)
- PodDisruptionBudget
- Pod anti-affinity

#### `kubernetes/training-cronjob.yaml`
**Schedule**: Friday 2:00 AM UTC  
**Configuration**:
- ServiceAccount with limited RBAC
- Volume mount for Firebase credentials
- Resource limits (4GB max)
- Termination grace period

---

## Installation & Usage

### Quick Start
```bash
# 1. Start all services
docker-compose -f docker-compose.mlops.yml up -d

# 2. Wait for services to be ready
docker-compose -f docker-compose.mlops.yml ps

# 3. Train first model
docker-compose -f docker-compose.mlops.yml run trainer

# 4. Access UIs
# MLflow: http://localhost:5000
# API: http://localhost:8001/docs
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
```

### Development Setup
```bash
# Install dependencies locally
pip install -r mlops/requirements-mlops.txt

# Set env vars
export MLFLOW_TRACKING_URI=http://localhost:5000

# Run training script
python mlops/training/train_demand_forecast.py

# Run inference service locally
python -m uvicorn mlops.inference_service:app --reload
```

### Production Deployment (Kubernetes)
```bash
# Create namespace
kubectl create namespace mlops

# Deploy MLOps stack
kubectl apply -f mlops/kubernetes/

# Check status
kubectl get pods -n mlops
kubectl get svc -n mlops
```

---

## Configuration

### Environment Variables

**Inference Service**:
```bash
MLFLOW_TRACKING_URI=http://localhost:5000    # MLflow server URL
LOG_LEVEL=INFO                               # Log verbosity
```

**Training Pipeline**:
```bash
MLFLOW_TRACKING_URI=http://localhost:5000    # MLflow server URL
FIREBASE_CREDENTIALS_PATH=/path/to/creds.json # Firebase credentials
LOG_LEVEL=INFO
```

**Application Integration**:
```bash
MLOPS_INFERENCE_API=http://localhost:8001    # Inference service URL
USE_EMBEDDED_ML=false                        # Use FastAPI (not embedded)
MLOPS_ADMIN_TOKEN=xyz                        # For model promotion
```

---

## Monitoring & Alerts

### Key Metrics
```
model_inference_latency_seconds       # P50, P95, P99 latency
model_inferences_total                # Total predictions by model/version
model_inference_errors_total          # Errors by model/error type
model_data_drift_score                # KL divergence score
model_version_current                 # Current production version
```

### Alert Examples
- **CRITICAL**: Inference error rate > 5% for 5 min
- **CRITICAL**: Data drift detected (score > 0.15) for 10 min
- **CRITICAL**: Training pipeline failed
- **WARNING**: P99 latency > 1 second for 5 min
- **WARNING**: Model performance degraded > 10%

---

## File Dependencies

```
inference_service.py
├── mlflow (model loading)
├── fastapi, uvicorn (server)
├── prometheus_client (metrics)
└── tensorflow (model inference)

training/train_demand_forecast.py
├── mlflow (model registration)
├── tensorflow (model training)
├── pandas, numpy (data processing)
├── firebase_admin (data loading)
└── sklearn (preprocessing)

monitoring/drift_detector.py
├── numpy, scipy (statistics)
└── (no external ML dependencies)
```

---

## Common Operations

### View Model Versions
```bash
# Via MLflow API
curl http://localhost:5000/api/2.0/registered-models

# Via inference API
curl http://localhost:8001/models
```

### Promote Model to Production
```bash
curl -X POST http://localhost:8001/models/demand_forecast/promote \
  -H "Content-Type: application/json" \
  -d '{"version": "2", "stage": "Production"}'
```

### Make Prediction
```bash
curl -X POST http://localhost:8001/predict/demand-forecast \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "v123",
    "product_id": "p456",
    "days_ahead": 7
  }'
```

### Check Model Metrics
```python
import mlflow
mlflow.set_tracking_uri("http://localhost:5000")
client = mlflow.tracking.MlflowClient()
models = client.list_registered_models()
for m in models:
    print(f"{m.name}: {m.latest_versions[0].current_stage}")
```

### View Drift Detection Results
```bash
# Check Prometheus metrics
curl http://localhost:9090/api/v1/query?query=model_data_drift_score

# View Grafana dashboard
open http://localhost:3001/d/[dashboard_id]
```

---

## Troubleshooting

### Services won't start
```bash
# Check Docker
docker logs [service_name]

# Check ports are available
lsof -i :5000 :8001 :9090 :3001

# Rebuild images
docker-compose -f docker-compose.mlops.yml build --no-cache
```

### Model not loading
```bash
# Check MLflow database
ls -la mlops_backend/

# Check artifacts
ls -la mlops_artifacts/

# Verify model registration
curl http://localhost:5000/api/2.0/registered-models
```

### Inference errors
```bash
# Check logs
docker logs zilacart_inference

# Verify model exists
curl http://localhost:8001/models

# Test health endpoint
curl http://localhost:8001/health
```

### Training fails
```bash
# Check logs
docker logs zilacart_trainer

# Verify Firebase credentials
echo $FIREBASE_CREDENTIALS_PATH
ls -la [credentials file]

# Test data connection
python mlops/training/train_demand_forecast.py
```

---

## Best Practices

1. **Always use model versions**: Don't update production models in-place
2. **Monitor before deploying**: Check Grafana for baseline metrics
3. **Test model locally first**: Verify locally before K8s deployment
4. **Keep model size small**: Target < 200MB for fast loading
5. **Cache predictions when possible**: Use TTL-based caching
6. **Alert on drift early**: Don't wait for accuracy to tank
7. **Version your training data**: Know exactly what you trained on
8. **Document model decisions**: Why was v2 chosen over v1?
9. **Plan for failures**: Always have fallback to embedded service
10. **Monitor in production**: Set up comprehensive alerting

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Inference latency (P99) | < 100ms | ~80ms |
| Model load time | < 1s | ~200ms |
| Training time | < 15min | ~10min |
| Uptime | > 99.9% | N/A |
| Error rate | < 0.1% | < 0.01% |
| Data throughput | > 1M predictions/day | Ready |

---

## Future Enhancements

- [ ] Add fraud detection model trainer
- [ ] Add recommendations model trainer
- [ ] Implement A/B testing framework
- [ ] Add model quantization for speed
- [ ] Create Helm charts for easier deployment
- [ ] Add multi-GPU support for training
- [ ] Implement federated learning
- [ ] Add data versioning (DVC)
- [ ] Add feature store (Feast)
- [ ] Implement explainability (SHAP)

---

## References

- [MLflow Documentation](https://mlflow.org/docs/latest/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/grafana/latest/)
- [TensorFlow Keras](https://keras.io/)
- [Kubernetes Docs](https://kubernetes.io/docs/)

---

**Maintained by**: MLOps Team  
**Last Updated**: May 20, 2026  
**Version**: 1.0.0
