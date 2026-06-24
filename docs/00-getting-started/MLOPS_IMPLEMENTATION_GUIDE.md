# 🚀 MLOps Implementation Guide - ZilaCart

**Estimated Setup Time**: 1-2 hours  
**Status**: Ready for Implementation  
**Target Start**: Immediately  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Training Pipeline](#phase-2-training-pipeline)
5. [Phase 3: Monitoring](#phase-3-monitoring)
6. [Phase 4: Production Rollout](#phase-4-production-rollout)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- Docker & Docker Compose
- Python 3.10+
- 4GB+ RAM available
- Ports: 5000 (MLflow), 8001 (API), 9090 (Prometheus), 3001 (Grafana)

### Verify Prerequisites
```bash
docker --version    # Should be 20.10+
docker-compose --version  # Should be 2.0+
python3 --version   # Should be 3.10+
```

---

## Quick Start

### 1-Minute Setup (Local Development)

```bash
# 1. Start MLOps stack
docker-compose -f docker-compose.mlops.yml up -d

# 2. Wait for services to be healthy (30-60 seconds)
docker-compose -f docker-compose.mlops.yml ps

# 3. Access services
#    MLflow UI:    http://localhost:5000
#    Inference API: http://localhost:8001
#    Prometheus:   http://localhost:9090
#    Grafana:      http://localhost:3001
```

**Expected Output:**
```
NAME                         STATUS
zilacart_mlflow             healthy
zilacart_inference          healthy
zilacart_prometheus         up
zilacart_grafana            up
```

### Verify Installation

```bash
# Check MLflow
curl http://localhost:5000/health

# Check Inference API
curl http://localhost:8001/health

# Both should return: {"status": "healthy", ...}
```

---

## Phase 1: Foundation

### Step 1.1: Initialize MLflow Server

```bash
# Already running from quick start, but let's verify

# Access MLflow UI
open http://localhost:5000

# Expected: Empty experiment list (ready for models)
```

### Step 1.2: Test Inference API

```bash
# List registered models (should be empty)
curl http://localhost:8001/models

# Expected response:
# {"models": [], "count": 0}
```

### Step 1.3: Train & Register First Model

```bash
# Navigate to training directory
cd mlops/training

# Run training pipeline
python train_demand_forecast.py

# Expected output:
# ========================================
# Starting MLOps Training Pipeline
# ========================================
# Loading historical data from Firestore...
# Generated 90 synthetic orders
# Engineering features...
# Building model...
# Training model...
# Registering model to MLflow...
# ✅ Training Pipeline Complete!
```

### Step 1.4: Verify Model in MLflow

```bash
# Check MLflow UI
open http://localhost:5000

# You should see:
# - New experiment: "sales-demand-forecasting"
# - Run with metrics: test_rmse, test_mape, etc.
# - Registered model: "demand_forecast"
```

### Step 1.5: Test Prediction via API

```bash
# Make prediction request
curl -X POST http://localhost:8001/predict/demand-forecast \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "vendor_123",
    "product_id": "product_456",
    "days_ahead": 7
  }'

# Expected response:
# {
#   "predicted_demand": 42,
#   "confidence": 0.85,
#   "model_version": "production",
#   "model_name": "demand_forecast",
#   "latency_ms": 23,
#   "drift_detected": false,
#   "timestamp": "2026-05-20T10:30:00"
# }
```

**✅ Phase 1 Success Criteria:**
- [ ] MLflow UI accessible and showing registered model
- [ ] Inference API responding to prediction requests
- [ ] Model metrics visible in MLflow
- [ ] API returns predictions in < 100ms

---

## Phase 2: Training Pipeline

### Step 2.1: Understand the Training Pipeline

**What it does:**
1. Loads last 90 days of sales data from Firestore
2. Engineers 10 features (seasonality, trends, etc.)
3. Trains neural network with TensorFlow
4. Evaluates on holdout test set
5. Registers to MLflow with metrics

**File**: `mlops/training/train_demand_forecast.py`

### Step 2.2: Run Training Manually

```bash
cd mlops/training
python train_demand_forecast.py

# Monitor logs for:
# - Loading data ✓
# - Engineering features ✓
# - Training model ✓
# - Test RMSE and MAPE
# - Registration to MLflow ✓
```

### Step 2.3: Run Training via Docker

```bash
# Run training container once
docker-compose -f docker-compose.mlops.yml run trainer

# Or run in background and check logs
docker-compose -f docker-compose.mlops.yml run -d trainer
docker logs zilacart_trainer
```

### Step 2.4: Schedule Weekly Retraining (Kubernetes)

```bash
# Deploy training CronJob
kubectl apply -f mlops/kubernetes/training-cronjob.yaml

# Verify
kubectl get cronjobs
kubectl describe cronjob mlops-trainer

# Expected output:
# Schedule: 0 2 * * 5  (Friday 2 AM)
# Last Schedule Time: (when last ran)
# Active jobs: (number currently running)
```

### Step 2.5: Compare Model Versions

```bash
# List all model versions in MLflow UI
open http://localhost:5000/models/demand_forecast

# You should see multiple versions with metrics:
# Version 1.0: RMSE 2.3, Status: ARCHIVED
# Version 2.0: RMSE 1.8, Status: PRODUCTION (current)
# Version 2.1: RMSE 1.5, Status: STAGING (latest)
```

### Step 2.6: Promote New Model to Production

```bash
# Option 1: Via API
curl -X POST http://localhost:8001/models/demand_forecast/promote \
  -H "Content-Type: application/json" \
  -d '{"version": "2", "stage": "Production"}'

# Option 2: Via MLflow UI
# Open MLflow → demand_forecast model → select version → Stage dropdown

# Expected response:
# {"status": "success", "model": "demand_forecast", "version": "2", "new_stage": "Production"}
```

**✅ Phase 2 Success Criteria:**
- [ ] Training pipeline runs without errors
- [ ] New models registered in MLflow with metrics
- [ ] Model versions visible and comparable
- [ ] New model promoted to production
- [ ] Inference API automatically uses new model version

---

## Phase 3: Monitoring

### Step 3.1: Set Up Prometheus Data Collection

```bash
# Prometheus is already running and scraping metrics from:
# - MLflow (registration events)
# - Inference API (prediction latency, errors)

# Access Prometheus UI
open http://localhost:9090

# Query test: http_requests_total
# Click "Execute" and view metrics
```

### Step 3.2: Create Grafana Dashboard

```bash
# Access Grafana
open http://localhost:3001

# Login: admin / admin

# Add Prometheus as datasource:
# - Configuration → Data Sources → Add data source
# - Select Prometheus
# - URL: http://prometheus:9090
# - Click "Save & Test"

# Import dashboard:
# - Dashboards → Import → Upload mlops/monitoring/grafana/dashboards/model-monitoring.json
```

### Step 3.3: Set Up Alerts

```yaml
# Prometheus alert rules are in: mlops/monitoring/prometheus.yml

# Alerts trigger when:
# ⚠️  Inference latency > 500ms for 10 minutes
# ⚠️  Error rate > 5% for 5 minutes
# ⚠️  Data drift detected (KL divergence > 0.15)
# 🔴 Training pipeline failed

# View firing alerts:
# http://localhost:9090/alerts
```

### Step 3.4: Simulate Drift Detection

```bash
# In a Python shell:
import numpy as np
from mlops.monitoring.drift_detector import DataDriftDetector

# Create baseline
baseline = np.random.randn(1000, 10)
detector = DataDriftDetector(baseline, threshold=0.15)

# Test 1: No drift
no_drift = np.random.randn(500, 10)
level, details = detector.detect_drift(no_drift)
print(f"Test 1 (no drift): {level.value}")  # Should be 'no_drift'

# Test 2: With drift
drift_data = np.random.randn(500, 10) + 2  # Shifted
level, details = detector.detect_drift(drift_data)
print(f"Test 2 (with drift): {level.value}")  # Should be 'high_drift'
```

### Step 3.5: View Metrics in Grafana

```
Dashboards available:
- Model Performance: Latency, error rate, throughput
- Data Drift: Feature distributions, KL divergence
- Model Registry: Version history, promotion timeline
- System Health: MLflow uptime, API health
```

**✅ Phase 3 Success Criteria:**
- [ ] Prometheus scraping metrics from inference service
- [ ] Grafana dashboards displaying real-time metrics
- [ ] Drift detector identifies shifts in data
- [ ] Alerts firing on performance degradation
- [ ] Historical metrics viewable (30-day retention)

---

## Phase 4: Production Rollout

### Step 4.1: Update App to Use Inference Service

**Replace embedded ML service with HTTP calls to FastAPI**

**File**: `src/lib/services/ml-client.ts` (NEW)

```typescript
// Create ML client that calls FastAPI instead of embedded service
export class MLClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
  }

  async predictDemandForecast(params: {
    vendor_id: string;
    product_id: string;
    days_ahead?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/predict/demand-forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) throw new Error('Prediction failed');
    return response.json();
  }

  async getModelInfo() {
    const response = await fetch(`${this.baseUrl}/models`);
    return response.json();
  }

  async promoteModel(name: string, version: string, stage: string) {
    const response = await fetch(`${this.baseUrl}/models/${name}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, stage }),
    });
    return response.json();
  }
}
```

**Usage in app:**

```typescript
// Before: Using embedded service
import { mlService } from '@/lib/services/ml-service';
const prediction = await mlService.predictSales(data);

// After: Using HTTP client
import { mlClient } from '@/lib/services/ml-client';
const result = await mlClient.predictDemandForecast({
  vendor_id: 'v123',
  product_id: 'p456',
});
```

### Step 4.2: Configure Environment Variables

**`.env.local`:**
```bash
# MLOps Configuration
MLFLOW_TRACKING_URI=http://localhost:5000
MLOPS_INFERENCE_API=http://localhost:8001
USE_INFERENCE_API=true  # Toggle between embedded and API
```

### Step 4.3: Handle Graceful Fallback

```typescript
// If inference service is down, fall back to embedded service
async function predictWithFallback(params) {
  try {
    if (process.env.USE_INFERENCE_API === 'true') {
      return await mlClient.predictDemandForecast(params);
    }
  } catch (error) {
    logger.warn('Inference service unavailable, using embedded service');
  }
  
  // Fallback to embedded service
  return await mlService.predictSales(data);
}
```

### Step 4.4: Update Model Without App Restart

```bash
# 1. New model trained and registered in MLflow

# 2. Promote to PRODUCTION
curl -X POST http://localhost:8001/models/demand_forecast/promote \
  -d '{"version": "3", "stage": "Production"}'

# 3. Inference service automatically loads new model (next request)

# 4. No app restart needed!
```

### Step 4.5: Verify Production Readiness

```bash
# Checklist:
# [ ] MLOps stack running without errors
# [ ] At least one model registered in MLflow
# [ ] Inference API responding to requests
# [ ] Grafana dashboard active and monitoring
# [ ] App configured to use inference service
# [ ] Fallback logic working
# [ ] Training pipeline scheduled
# [ ] Alerts configured and tested
```

**✅ Phase 4 Success Criteria:**
- [ ] App uses FastAPI for predictions (not embedded service)
- [ ] Model update without app restart confirmed
- [ ] Monitoring shows predicted request latency
- [ ] Zero downtime model updates working
- [ ] Rollback to previous model tested
- [ ] Complete end-to-end flow working

---

## Troubleshooting

### Issue: MLflow not accessible

```bash
# Check container health
docker-compose -f docker-compose.mlops.yml ps

# View logs
docker logs zilacart_mlflow

# Restart
docker-compose -f docker-compose.mlops.yml restart mlflow
```

### Issue: Training fails

```bash
# Check logs
docker logs zilacart_trainer

# Common causes:
# - Firebase credentials missing: Set FIREBASE_CREDENTIALS_PATH
# - Out of memory: Reduce batch size in training config
# - Missing dependencies: pip install -r mlops/requirements-mlops.txt
```

### Issue: Inference API returning 500 errors

```bash
# Check logs
docker logs zilacart_inference

# Common causes:
# - Model not loaded: Check MLflow has registered models
# - Out of memory for model: Increase container memory
# - Input feature mismatch: Verify feature dimensions

# Test endpoint
curl http://localhost:8001/health
curl http://localhost:8001/models
```

### Issue: Slow predictions (> 200ms)

```bash
# Check Grafana dashboard for latency chart

# Optimization steps:
# 1. Increase inference service replicas
# 2. Use model quantization (int8 instead of float32)
# 3. Enable model caching
# 4. Add horizontal pod autoscaling (HPA)
```

### Issue: Prometheus not collecting metrics

```bash
# Check Prometheus targets
# http://localhost:9090/targets

# If inference API is DOWN:
# 1. Restart inference service
# 2. Check port 8001 is open
# 3. Verify MLFLOW_TRACKING_URI is correct
```

---

## Next Steps

### Week 1:
- [ ] Complete Phase 1-4
- [ ] Verify end-to-end flow in staging
- [ ] Test model promotion workflow

### Week 2:
- [ ] Deploy to Kubernetes (using helm)
- [ ] Enable auto-scaling for inference service
- [ ] Set up PagerDuty alerts

### Week 3:
- [ ] Train second model (fraud detection or recommendations)
- [ ] Set up A/B testing framework
- [ ] Document runbooks for ops team

### Ongoing:
- [ ] Monitor model performance weekly
- [ ] Retrain models when drift detected
- [ ] Update model serving code as needed
- [ ] Gather feedback from stakeholders

---

## Reference URLs

- **MLflow Documentation**: https://mlflow.org/docs/latest/index.html
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Prometheus Alerting**: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- **Grafana Dashboard**: https://grafana.com/grafana/dashboards/
- **Model Monitoring Best Practices**: https://ml-ops.systems/

---

## Support & Questions

**Documentation files:**
- `MLOPS_ARCHITECTURE.md` - System design
- `MLOPS_IMPLEMENTATION_GUIDE.md` - This file
- `mlops/training/README.md` - Training details
- `mlops/monitoring/README.md` - Monitoring setup

**Common commands:**
```bash
# Start services
docker-compose -f docker-compose.mlops.yml up -d

# Stop services
docker-compose -f docker-compose.mlops.yml down

# View logs
docker-compose -f docker-compose.mlops.yml logs -f [service_name]

# Run training
docker-compose -f docker-compose.mlops.yml run trainer

# Rebuild images
docker-compose -f docker-compose.mlops.yml build --no-cache
```

---

**Status**: ✅ Ready for Implementation  
**Last Updated**: May 20, 2026  
**Version**: 1.0
