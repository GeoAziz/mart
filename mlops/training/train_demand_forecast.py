"""
MLOps Training Pipeline - Sales Demand Forecasting
Trains, evaluates, and registers models to MLflow
"""

import os
import sys
import logging
import mlflow
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple, Dict, Any
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================================
# Setup
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MLflow Setup
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
mlflow.set_experiment("sales-demand-forecasting")

# Firebase Setup (optional)
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS_PATH")
if FIREBASE_CREDENTIALS and Path(FIREBASE_CREDENTIALS).exists():
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.warning(f"Firebase initialization failed: {e}")
        db = None
else:
    db = None
    logger.info("Firebase not configured, using synthetic data")

# ============================================================================
# Data Loading
# ============================================================================

def load_historical_data(days_back: int = 90) -> pd.DataFrame:
    """Load historical order data from Firestore or generate synthetic data"""
    
    if db:
        try:
            logger.info(f"Loading historical data from Firestore (last {days_back} days)...")
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            orders_ref = db.collection('orders')
            docs = orders_ref.where('createdAt', '>=', cutoff_date).stream()
            
            data = []
            for doc in docs:
                order = doc.to_dict()
                data.append({
                    'date': order.get('createdAt', datetime.utcnow()).date(),
                    'vendor_id': order.get('vendorId', 'unknown'),
                    'product_id': order.get('productId', 'unknown'),
                    'quantity': sum(item.get('quantity', 0) for item in order.get('items', [])),
                    'revenue': sum(item.get('price', 0) * item.get('quantity', 0) 
                                 for item in order.get('items', [])),
                    'payment_method': order.get('paymentMethod', 'unknown'),
                })
            
            df = pd.DataFrame(data)
            logger.info(f"Loaded {len(df)} orders from Firestore")
            return df
        
        except Exception as e:
            logger.error(f"Failed to load from Firestore: {e}")
            logger.info("Falling back to synthetic data")
    
    # Generate synthetic data if Firestore not available
    logger.info("Generating synthetic historical data...")
    dates = pd.date_range(end=datetime.utcnow(), periods=days_back, freq='D')
    
    data = []
    for date in dates:
        # Add seasonal pattern
        day_of_year = date.timetuple().tm_yday
        seasonality = 1.0 + 0.3 * np.sin(2 * np.pi * day_of_year / 365)
        
        # Random base demand
        base_demand = np.random.poisson(20)
        quantity = max(int(base_demand * seasonality), 0)
        
        data.append({
            'date': date.date(),
            'vendor_id': f"vendor_{np.random.randint(1, 20)}",
            'product_id': f"product_{np.random.randint(1, 100)}",
            'quantity': quantity,
            'revenue': quantity * np.random.uniform(50, 500),
            'payment_method': np.random.choice(['paypal', 'stripe', 'card']),
        })
    
    df = pd.DataFrame(data)
    logger.info(f"Generated {len(df)} synthetic orders")
    return df

def engineer_features(df: pd.DataFrame, lookback: int = 30) -> Tuple[np.ndarray, np.ndarray]:
    """Engineer features for demand forecasting"""
    
    logger.info("Engineering features...")
    
    # Group by date and aggregate
    daily_data = df.groupby('date').agg({
        'quantity': 'sum',
        'revenue': 'sum'
    }).reset_index()
    
    daily_data = daily_data.sort_values('date')
    daily_data['date'] = pd.to_datetime(daily_data['date'])
    
    # Calculate features
    features_list = []
    targets_list = []
    
    for i in range(lookback, len(daily_data) - 1):
        # Historical features (last 30 days)
        hist_quantities = daily_data['quantity'].iloc[i-lookback:i].values
        hist_revenues = daily_data['revenue'].iloc[i-lookback:i].values
        
        # Time-based features
        current_date = daily_data['date'].iloc[i]
        day_of_week = current_date.dayofweek
        day_of_year = current_date.dayofyear
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Derived features
        mean_qty = np.mean(hist_quantities)
        std_qty = np.std(hist_quantities)
        trend_qty = np.polyfit(range(lookback), hist_quantities, 1)[0]
        seasonality = np.mean([hist_quantities[j] for j in range(len(hist_quantities)) 
                              if (i - lookback + j) % 7 == day_of_week]) if lookback >= 7 else mean_qty
        
        features = [
            mean_qty,
            std_qty,
            trend_qty,
            seasonality,
            day_of_week / 7,
            day_of_year / 365,
            is_weekend,
            np.max(hist_quantities),
            np.min(hist_quantities),
            np.median(hist_quantities)
        ]
        
        target = daily_data['quantity'].iloc[i + 1]
        
        features_list.append(features)
        targets_list.append(target)
    
    X = np.array(features_list)
    y = np.array(targets_list)
    
    logger.info(f"Engineered {len(X)} samples with {X.shape[1]} features")
    
    return X, y

# ============================================================================
# Model Training
# ============================================================================

def build_model(input_shape: int) -> tf.keras.Model:
    """Build neural network for demand forecasting"""
    
    logger.info("Building model...")
    
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(1, activation='linear')  # Regression output
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae', 'mape']
    )
    
    return model

def train_model(X: np.ndarray, y: np.ndarray, 
                epochs: int = 50, batch_size: int = 32) -> tf.keras.Model:
    """Train demand forecasting model"""
    
    logger.info("Training model...")
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # Build and train
    model = build_model(X_scaled.shape[1])
    
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        verbose=1,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True
            )
        ]
    )
    
    # Evaluate
    test_loss, test_mae, test_mape = model.evaluate(X_test, y_test, verbose=0)
    
    # Calculate additional metrics
    y_pred = model.predict(X_test, verbose=0)
    rmse = np.sqrt(np.mean((y_test - y_pred.flatten()) ** 2))
    mape = np.mean(np.abs((y_test - y_pred.flatten()) / (y_test + 1))) * 100
    
    metrics = {
        'test_loss': float(test_loss),
        'test_mae': float(test_mae),
        'test_mape': float(test_mape),
        'test_rmse': float(rmse),
        'mape_percent': float(mape),
        'training_samples': len(X_train),
        'test_samples': len(X_test)
    }
    
    logger.info(f"Model trained. RMSE: {rmse:.2f}, MAPE: {mape:.2f}%")
    
    return model, metrics, scaler

# ============================================================================
# MLflow Registration
# ============================================================================

def register_model_to_mlflow(model: tf.keras.Model, metrics: Dict[str, float],
                             scaler, model_name: str = "demand_forecast"):
    """Register trained model to MLflow"""
    
    logger.info("Registering model to MLflow...")
    
    with mlflow.start_run():
        # Log parameters
        mlflow.log_param("model_type", "neural_network")
        mlflow.log_param("layers", 5)
        mlflow.log_param("epochs", 50)
        
        # Log metrics
        for metric_name, metric_value in metrics.items():
            mlflow.log_metric(metric_name, metric_value)
        
        # Log model
        mlflow.tensorflow.log_model(
            model=model,
            artifact_path="demand_forecast_model",
            registered_model_name=model_name,
            metadata={
                "scaler_type": "StandardScaler",
                "features": 10,
                "target": "daily_quantity_demanded",
                "training_date": datetime.utcnow().isoformat()
            }
        )
        
        # Log scaler as artifact
        import pickle
        scaler_path = "/tmp/scaler.pkl"
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        mlflow.log_artifact(scaler_path)
        
        run_id = mlflow.active_run().info.run_id
        logger.info(f"Model registered to MLflow. Run ID: {run_id}")
        
        return run_id

# ============================================================================
# Main Pipeline
# ============================================================================

def run_training_pipeline():
    """Execute complete training pipeline"""
    
    logger.info("=" * 80)
    logger.info("Starting MLOps Training Pipeline - Sales Demand Forecasting")
    logger.info("=" * 80)
    
    try:
        # Step 1: Load data
        df = load_historical_data(days_back=90)
        logger.info(f"Data shape: {df.shape}")
        
        # Step 2: Engineer features
        X, y = engineer_features(df, lookback=30)
        logger.info(f"Features shape: {X.shape}, Target shape: {y.shape}")
        
        # Step 3: Train model
        model, metrics, scaler = train_model(X, y, epochs=50, batch_size=32)
        logger.info(f"Training metrics: {metrics}")
        
        # Step 4: Register to MLflow
        run_id = register_model_to_mlflow(model, metrics, scaler)
        
        logger.info("=" * 80)
        logger.info("✅ Training Pipeline Complete!")
        logger.info("=" * 80)
        logger.info(f"✓ Model registered with run ID: {run_id}")
        logger.info(f"✓ Test RMSE: {metrics['test_rmse']:.2f}")
        logger.info(f"✓ Test MAPE: {metrics['mape_percent']:.2f}%")
        logger.info(f"\nNext steps:")
        logger.info("1. Review model in MLflow UI: http://localhost:5000")
        logger.info("2. If satisfied, promote to PRODUCTION stage")
        logger.info("3. Inference service will automatically use new version")
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {str(e)}")
        logger.exception(e)
        return False

if __name__ == "__main__":
    success = run_training_pipeline()
    sys.exit(0 if success else 1)
