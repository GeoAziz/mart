# 🤖 MLOps Architecture - ZilaCart Implementation

**Status**: Ready for Implementation  
**Date**: May 20, 2026  
**Priority**: Phase 1 - Foundation Layer  

---

## Executive Summary

This document outlines a lightweight, production-ready MLOps system that transforms the existing ML models from embedded prototypes into versioned, monitored, retrained services. The system adds model registry, serving, and monitoring WITHOUT introducing research-grade complexity.

---

## 1. Why This Matters for ZilaCart

### Current Risk (Models-in-App)
```
Problem: Model hardcoded in application
├─ Can't update without app redeployment
├─ No tracking of model performance
├─ Data drift goes undetected
├─ Can't rollback if model breaks
└─ No A/B testing capability
```

### After MLOps (Models-as-Service)
```
Solution: Decoupled model serving + monitoring
├─ Update models without app redeployment
├─ Track accuracy, precision, drift over time
├─ Auto-alert when performance degrades
├─ Instant rollback to previous version
└─ Easy A/B testing of new models
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ZilaCart Application                      │
│                   (Next.js + Firebase)                       │
├─────────────────────────────────────────────────────────────┤
│                  ML Inference API (FastAPI)                  │
│  /predict/recommendations                                   │
│  /predict/demand-forecast                                   │
│  /predict/fraud-score                                       │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP REST
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐   ┌────────▼────────┐
│  MLflow Registry │   │  Prometheus     │
│  (Model Store)   │   │  (Metrics)      │
├──────────────────┤   ├─────────────────┤
│ - Version 1.0    │   │ - Latency       │
│ - Version 1.1    │   │ - Error rate    │
│ - Version 2.0    │   │ - Drift score   │
└────────┬─────────┘   └────────┬────────┘
         │                      │
    ┌────▼────────────────────┬─┘
    │                         │
┌───▼──────────┐   ┌──────────▼──────┐
│ Training     │   │   Grafana       │
│ Pipeline     │   │   Dashboard     │
└──────────────┘   └─────────────────┘
```

---

## 3. Four Core Components

### 3.1 Model Registry (MLflow)

**Purpose**: Version, track, and manage model artifacts

```yaml
Files:
  /mlops/mlflow-setup.sh          # Initialize MLflow server
  /mlops/mlflow/MLmodel           # Model manifest
  /docker-compose.mlops.yml       # MLflow container

Responsibilities:
  - Store model versions with metrics
  - Track accuracy, precision, F1 score
  - Link to data used for training
  - Serve "production" model
```

**Example Registry Entry:**
```
Model: sales-predictor
├─ Version 1.0 (2026-01-15)
│  ├─ Accuracy: 0.87
│  ├─ RMSE: 2.3
│  ├─ Status: ARCHIVED
│  └─ Data: Jan 2025 sales
├─ Version 2.0 (2026-02-20)
│  ├─ Accuracy: 0.91
│  ├─ RMSE: 1.8
│  ├─ Status: PRODUCTION
│  └─ Data: Jan-Feb 2025 sales
└─ Version 2.1-STAGING (2026-05-19)
   ├─ Accuracy: 0.93
   ├─ RMSE: 1.5
   ├─ Status: STAGING
   └─ Data: Jan-May 2025 sales
```

### 3.2 Model Serving (FastAPI)

**Purpose**: Expose models as REST APIs, handle versioning

```yaml
Service: mlops-inference
Port: 8001
Endpoints:
  POST /predict/recommendations     # Product recommendations
  POST /predict/demand-forecast     # Inventory forecasting
  POST /predict/fraud-score         # Payment risk
  GET  /models                      # List available models
  POST /models/promote              # Promote version to prod
  GET  /models/{name}/{version}     # Get model metadata
```

**Example Request/Response:**
```python
POST /predict/demand-forecast
{
  "vendor_id": "vendor_123",
  "product_id": "prod_456",
  "days_ahead": 7,
  "model_version": "2.0"  # Optional, defaults to PRODUCTION
}

Response:
{
  "predicted_demand": 45,
  "confidence": 0.89,
  "model_version": "2.0",
  "latency_ms": 23,
  "drift_detected": false
}
```

### 3.3 Training Pipeline

**Purpose**: Automate model retraining from production data

```yaml
Scheduler: Kubernetes CronJob or APScheduler
Frequency: Weekly (Friday 2 AM)
Process:
  1. Fetch last 90 days of data
  2. Split: 80% train, 20% validate
  3. Hyperparameter tuning
  4. Train new model
  5. Evaluate on holdout test set
  6. Compare vs current production
  7. If better: register as STAGING
  8. Post notification
```

**Key Metrics Tracked:**
- Accuracy / RMSE / F1 Score
- Training time
- Data size
- Hyperparameters used
- Date range of data

### 3.4 Monitoring & Alerts

**Purpose**: Detect model drift, performance degradation, serving errors

```yaml
Metrics (Prometheus):
  - model_inference_latency         # P50, P95, P99
  - model_prediction_errors         # Count by model
  - model_drift_score               # KL divergence
  - model_retraining_success        # 1/0
  - model_version_current           # Which version in prod

Alerts (Grafana):
  ⚠️  Latency > 500ms for 10 min
  ⚠️  Error rate > 5% for 5 min
  ⚠️  Drift score > 0.15 (data changed significantly)
  ⚠️  Training pipeline failed
  🔄 New model promoted to production
```

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Deploy MLflow server
- [ ] Wrap existing TensorFlow models
- [ ] Create simple FastAPI serving layer
- [ ] Basic metrics export

**Deliverables:**
- MLflow running on port 5000
- FastAPI on port 8001
- Prometheus scraping model metrics

### Phase 2: Training Pipeline (Week 2)
- [ ] Data export from Firestore
- [ ] Training script (sales forecasting first)
- [ ] Evaluation framework
- [ ] Auto-registration to MLflow

**Deliverables:**
- Weekly training job
- 2+ model versions in registry
- Comparison report

### Phase 3: Monitoring (Week 3)
- [ ] Prometheus collectors for model metrics
- [ ] Grafana dashboard
- [ ] Drift detection
- [ ] Alert rules

**Deliverables:**
- Dashboard showing model performance
- Drift alerts working
- Baseline metrics

### Phase 4: Integration (Week 4)
- [ ] Retire embedded ml-service
- [ ] Route app → FastAPI inference
- [ ] Add promote/rollback commands
- [ ] Production validation

**Deliverables:**
- App using FastAPI for predictions
- Zero downtime model updates
- Rollback tested and working

---

## 5. Key Decisions

### Why MLflow (vs. Weights & Biases)?
- Open-source, self-hosted (no external dependency)
- Lightweight (single Python package)
- Fits on-premise/private infrastructure
- No vendor lock-in

### Why FastAPI (vs. TensorFlow Serving)?
- Single process to learn, no heavy machinery
- Python-native for our stack
- Easy custom logic (feature engineering, business rules)
- Scales fine for e-commerce use case

### Why Weekly Retraining?
- Catches weekly trends (e.g., weekend spikes)
- Avoids excessive compute
- Enough data for statistical significance
- Easy to adjust based on drift alerts

### Why Kubernetes CronJob?
- Runs in same cluster as app
- No new infrastructure
- Can reuse existing secrets/configs
- Logs to existing observability

---

## 6. Implementation Files

Files to create:
```
mlops/
├── mlflow-setup.sh                # Initialize MLflow
├── inference-service.py           # FastAPI app
├── training/
│   ├── train_sales_predictor.py   # Main trainer
│   ├── train_demand_forecast.py
│   ├── train_fraud_detector.py
│   └── training_config.py
├── monitoring/
│   ├── drift_detector.py          # Statistical drift detection
│   └── prometheus_metrics.py      # Metric collectors
├── kubernetes/
│   ├── mlflow-deployment.yaml
│   ├── inference-deployment.yaml
│   └── training-cronjob.yaml
└── docker/
    ├── Dockerfile.mlflow          # MLflow server image
    ├── Dockerfile.inference       # FastAPI inference image
    └── Dockerfile.trainer         # Training pipeline image

Integration:
├── src/lib/services/ml-client.ts  # HTTP wrapper for app → FastAPI
├── docker-compose.mlops.yml       # Local dev setup
└── .env.mlops.example              # MLOps env vars
```

---

## 7. Success Criteria

✅ Phase 1 Success:
- MLflow reachable at `http://localhost:5000`
- FastAPI reachable at `http://localhost:8001`
- `/models` endpoint returns registered models

✅ Phase 2 Success:
- Training job completes without error
- New model registered with metrics
- Model version > previous version (accuracy)

✅ Phase 3 Success:
- Prometheus scrapes model metrics
- Grafana shows model latency chart
- Drift detection fires alert on synthetic drift

✅ Phase 4 Success:
- App calls FastAPI instead of embedded service
- Update model in MLflow without app restart
- Metrics show improvement

---

## 8. Next Steps

1. **Immediate**: Review this architecture with team
2. **Day 1**: Set up MLflow server (Phase 1)
3. **Day 2-3**: Build FastAPI wrapper (Phase 1)
4. **Day 4-5**: Create training pipeline (Phase 2)
5. **Day 6-7**: Set up monitoring (Phase 3)
6. **Week 2**: Production cutover (Phase 4)

**Effort Estimate**: 40-60 engineering hours total

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Model serving too slow | Start with CPU-only, cache predictions, profile early |
| Training pipeline fails | Alert on failure, keep last-known-good model, manual trigger |
| Data quality degrades | Monitor input feature distributions, implement data validation |
| Drift not detected | Start with simple statistical checks, add complexity over time |
| Model registry fills up | Auto-archive old versions, keep last 10 |

---

## 10. Appendix: Glossary

**Model Registry**: Database of trained model artifacts + metadata (version, metrics, status)  
**Model Serving**: API that accepts features, returns predictions from registered models  
**Model Drift**: When the underlying data distribution changes (model still works but less accurately)  
**Retraining**: Periodically training new model on fresh data to stay accurate  
**A/B Testing**: Comparing two model versions on live traffic  
**Promotion**: Moving a model version from STAGING → PRODUCTION  
**Rollback**: Reverting to previous model version if new one performs poorly  

---

**Next Document**: See `MLOPS_IMPLEMENTATION_GUIDE.md` for detailed setup steps.
