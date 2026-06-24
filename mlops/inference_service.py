"""
MLOps Inference Service - FastAPI
Exposes ML models as HTTP REST API with versioning and monitoring
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import mlflow
import numpy as np
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import time
import os
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="ZilaCart MLOps Inference Service",
    description="Serves ML models for recommendations, forecasting, fraud detection",
    version="1.0.0"
)

# MLflow Setup
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

# ============================================================================
# Prometheus Metrics
# ============================================================================

inference_counter = Counter(
    'model_inferences_total',
    'Total number of model inferences',
    ['model_name', 'version']
)

inference_latency = Histogram(
    'model_inference_latency_seconds',
    'Model inference latency in seconds',
    ['model_name', 'version'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0)
)

inference_errors = Counter(
    'model_inference_errors_total',
    'Total inference errors',
    ['model_name', 'error_type']
)

model_version_gauge = Gauge(
    'model_version_current',
    'Current model version in production',
    ['model_name']
)

# ============================================================================
# Request/Response Models
# ============================================================================

class DemandForecastRequest(BaseModel):
    vendor_id: str
    product_id: str
    days_ahead: int = 7
    model_version: Optional[str] = None
    features: Optional[Dict[str, float]] = None  # Historical sales, seasonality, etc.

class DemandForecastResponse(BaseModel):
    predicted_demand: float
    confidence: float
    model_version: str
    model_name: str
    latency_ms: float
    drift_detected: bool = False
    timestamp: str

class RecommendationsRequest(BaseModel):
    customer_id: str
    product_ids: List[str]
    num_recommendations: int = 5
    model_version: Optional[str] = None

class RecommendationsResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    scores: List[float]
    model_version: str
    model_name: str
    latency_ms: float
    timestamp: str

class FraudScoreRequest(BaseModel):
    order_id: str
    customer_id: str
    amount: float
    payment_method: str
    features: Optional[Dict[str, float]] = None

class FraudScoreResponse(BaseModel):
    fraud_score: float  # 0.0 to 1.0
    risk_level: str  # LOW, MEDIUM, HIGH
    model_version: str
    model_name: str
    latency_ms: float
    timestamp: str

class ModelMetadata(BaseModel):
    name: str
    version: str
    status: str  # PRODUCTION, STAGING, ARCHIVED
    accuracy: Optional[float]
    last_updated: str
    artifact_uri: str

# ============================================================================
# Model Loading & Caching
# ============================================================================

class ModelCache:
    def __init__(self):
        self.models = {}
        self.loaded_versions = {}
    
    def get_model(self, model_name: str, version: Optional[str] = None):
        """Get model from cache or load from MLflow"""
        cache_key = f"{model_name}:{version or 'latest'}"
        
        if cache_key in self.models:
            logger.info(f"Using cached model: {cache_key}")
            return self.models[cache_key]
        
        try:
            logger.info(f"Loading model from MLflow: {cache_key}")
            if version:
                model = mlflow.tensorflow.load_model(f"models:/{model_name}/{version}")
            else:
                model = mlflow.tensorflow.load_model(f"models:/{model_name}/production")
            
            self.models[cache_key] = model
            return model
        except Exception as e:
            logger.error(f"Failed to load model {cache_key}: {str(e)}")
            raise

model_cache = ModelCache()

# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "mlflow_uri": MLFLOW_TRACKING_URI
    }

@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

@app.get("/models")
async def list_models():
    """List all available models in registry"""
    try:
        client = mlflow.tracking.MlflowClient(MLFLOW_TRACKING_URI)
        registered_models = client.list_registered_models()
        
        models_info = []
        for model in registered_models:
            latest_version = model.latest_versions[0] if model.latest_versions else None
            models_info.append({
                "name": model.name,
                "latest_version": latest_version.version if latest_version else None,
                "status": latest_version.current_stage if latest_version else "None",
                "created_at": model.creation_timestamp,
                "last_updated": model.last_updated_timestamp
            })
        
        return {"models": models_info, "count": len(models_info)}
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get detailed info about a model"""
    try:
        client = mlflow.tracking.MlflowClient(MLFLOW_TRACKING_URI)
        registered_model = client.get_registered_model(model_name)
        
        versions = []
        for version in registered_model.latest_versions:
            versions.append({
                "version": version.version,
                "status": version.current_stage,
                "run_id": version.run_id,
                "created_at": version.creation_timestamp,
                "updated_at": version.last_updated_timestamp
            })
        
        return {
            "name": model_name,
            "versions": versions,
            "total_versions": len(registered_model.latest_versions)
        }
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")

# ============================================================================
# Prediction Endpoints
# ============================================================================

@app.post("/predict/demand-forecast", response_model=DemandForecastResponse)
async def predict_demand_forecast(request: DemandForecastRequest):
    """Predict product demand for specified days ahead"""
    start_time = time.time()
    model_name = "demand_forecast"
    
    try:
        # Load model
        model = model_cache.get_model(model_name, request.model_version)
        
        # Prepare features (example - adjust based on your actual features)
        if request.features:
            X = np.array([[
                request.features.get("historical_sales", 0),
                request.features.get("seasonality", 1.0),
                request.features.get("trend", 0),
                request.features.get("day_of_week", 0),
                request.features.get("promotional_flag", 0)
            ]])
        else:
            X = np.random.randn(1, 5)  # Placeholder
        
        # Make prediction
        prediction = model.predict(X)[0][0]
        confidence = 0.85  # Placeholder - calculate from model uncertainty
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Record metrics
        version = request.model_version or "production"
        inference_counter.labels(model_name=model_name, version=version).inc()
        inference_latency.labels(model_name=model_name, version=version).observe(latency_ms / 1000)
        
        return DemandForecastResponse(
            predicted_demand=float(prediction),
            confidence=confidence,
            model_version=version,
            model_name=model_name,
            latency_ms=latency_ms,
            drift_detected=False,
            timestamp=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        inference_errors.labels(model_name=model_name, error_type=type(e).__name__).inc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/recommendations", response_model=RecommendationsResponse)
async def predict_recommendations(request: RecommendationsRequest):
    """Get product recommendations for customer"""
    start_time = time.time()
    model_name = "recommendations"
    
    try:
        # Load model
        model = model_cache.get_model(model_name, request.model_version)
        
        # Prepare features based on customer and products
        X = np.random.randn(len(request.product_ids), 10)  # Placeholder
        
        # Get scores
        scores = model.predict(X).flatten().tolist()
        
        # Sort by score and get top N
        scored_products = sorted(
            zip(request.product_ids, scores),
            key=lambda x: x[1],
            reverse=True
        )[:request.num_recommendations]
        
        recommendations = [
            {
                "product_id": prod_id,
                "score": float(score),
                "rank": idx + 1
            }
            for idx, (prod_id, score) in enumerate(scored_products)
        ]
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Record metrics
        version = request.model_version or "production"
        inference_counter.labels(model_name=model_name, version=version).inc()
        inference_latency.labels(model_name=model_name, version=version).observe(latency_ms / 1000)
        
        return RecommendationsResponse(
            recommendations=recommendations,
            scores=[r["score"] for r in recommendations],
            model_version=version,
            model_name=model_name,
            latency_ms=latency_ms,
            timestamp=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        inference_errors.labels(model_name=model_name, error_type=type(e).__name__).inc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/fraud-score", response_model=FraudScoreResponse)
async def predict_fraud_score(request: FraudScoreRequest):
    """Score order for fraud risk"""
    start_time = time.time()
    model_name = "fraud_detector"
    
    try:
        # Load model
        model = model_cache.get_model(model_name, request.model_version)
        
        # Prepare features
        features = request.features or {
            "amount_zscore": (request.amount - 100) / 50,
            "payment_method_encoded": 1 if request.payment_method == "paypal" else 0,
            "time_of_day": datetime.utcnow().hour / 24,
        }
        
        X = np.array([[v for v in features.values()]])
        
        # Get fraud score (0-1)
        fraud_score = float(model.predict(X)[0][0])
        
        # Determine risk level
        if fraud_score > 0.7:
            risk_level = "HIGH"
        elif fraud_score > 0.4:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Record metrics
        version = request.model_version or "production"
        inference_counter.labels(model_name=model_name, version=version).inc()
        inference_latency.labels(model_name=model_name, version=version).observe(latency_ms / 1000)
        
        return FraudScoreResponse(
            fraud_score=fraud_score,
            risk_level=risk_level,
            model_version=version,
            model_name=model_name,
            latency_ms=latency_ms,
            timestamp=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Fraud detection error: {str(e)}")
        inference_errors.labels(model_name=model_name, error_type=type(e).__name__).inc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Model Management Endpoints
# ============================================================================

@app.post("/models/{model_name}/promote")
async def promote_model(model_name: str, version: str, stage: str = "Production"):
    """Promote model version to new stage (Production, Staging, Archived)"""
    try:
        client = mlflow.tracking.MlflowClient(MLFLOW_TRACKING_URI)
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage
        )
        
        # Clear cache to force reload
        for key in list(model_cache.models.keys()):
            if model_name in key:
                del model_cache.models[key]
        
        logger.info(f"Promoted {model_name} version {version} to {stage}")
        
        return {
            "status": "success",
            "model": model_name,
            "version": version,
            "new_stage": stage,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Promotion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/")
async def root():
    """API root with documentation link"""
    return {
        "service": "ZilaCart MLOps Inference Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
        "models": "/models"
    }

# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle all exceptions"""
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# ============================================================================
# Startup/Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("MLOps Inference Service starting...")
    logger.info(f"MLflow Tracking URI: {MLFLOW_TRACKING_URI}")
    logger.info("Service ready to accept predictions")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("MLOps Inference Service shutting down...")
    model_cache.models.clear()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
