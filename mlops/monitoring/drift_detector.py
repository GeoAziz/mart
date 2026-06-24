"""
MLOps Monitoring & Drift Detection
Monitors model performance and detects data drift
"""

import logging
import numpy as np
from scipy import stats
from datetime import datetime, timedelta
from typing import Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

# ============================================================================
# Enums
# ============================================================================

class DriftLevel(Enum):
    NO_DRIFT = "no_drift"
    LOW_DRIFT = "low_drift"
    MODERATE_DRIFT = "moderate_drift"
    HIGH_DRIFT = "high_drift"

# ============================================================================
# Performance Metrics
# ============================================================================

class ModelPerformanceMonitor:
    """Track model performance metrics over time"""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.predictions = []
        self.actuals = []
        self.timestamps = []
        self.latencies = []
    
    def record_prediction(self, prediction: float, actual: float, 
                         latency_ms: float, timestamp: Optional[datetime] = None):
        """Record a prediction for monitoring"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        self.predictions.append(prediction)
        self.actuals.append(actual)
        self.latencies.append(latency_ms)
        self.timestamps.append(timestamp)
    
    def get_metrics(self, window_size: int = 100) -> Dict[str, float]:
        """Calculate performance metrics over recent window"""
        
        if len(self.predictions) < window_size:
            window_size = len(self.predictions)
        
        if window_size == 0:
            return {}
        
        recent_preds = np.array(self.predictions[-window_size:])
        recent_actuals = np.array(self.actuals[-window_size:])
        recent_latencies = np.array(self.latencies[-window_size:])
        
        # Calculate metrics
        mae = np.mean(np.abs(recent_preds - recent_actuals))
        rmse = np.sqrt(np.mean((recent_preds - recent_actuals) ** 2))
        mape = np.mean(np.abs((recent_preds - recent_actuals) / (recent_actuals + 1))) * 100
        
        avg_latency = np.mean(recent_latencies)
        p95_latency = np.percentile(recent_latencies, 95)
        p99_latency = np.percentile(recent_latencies, 99)
        
        return {
            'mae': float(mae),
            'rmse': float(rmse),
            'mape': float(mape),
            'avg_latency_ms': float(avg_latency),
            'p95_latency_ms': float(p95_latency),
            'p99_latency_ms': float(p99_latency),
            'sample_size': window_size
        }

# ============================================================================
# Data Drift Detection
# ============================================================================

class DataDriftDetector:
    """Detect changes in input feature distribution (data drift)"""
    
    def __init__(self, baseline_features: np.ndarray, threshold: float = 0.15):
        """
        Initialize with baseline features
        
        Args:
            baseline_features: Reference data distribution (shape: n_samples x n_features)
            threshold: KL divergence threshold for drift detection
        """
        self.baseline_features = baseline_features
        self.threshold = threshold
        self.feature_stats = self._compute_stats(baseline_features)
    
    @staticmethod
    def _compute_stats(features: np.ndarray) -> Dict[int, Dict[str, float]]:
        """Compute statistics for each feature"""
        stats_dict = {}
        for i in range(features.shape[1]):
            feature = features[:, i]
            stats_dict[i] = {
                'mean': float(np.mean(feature)),
                'std': float(np.std(feature)),
                'min': float(np.min(feature)),
                'max': float(np.max(feature)),
                'median': float(np.median(feature)),
                'q25': float(np.percentile(feature, 25)),
                'q75': float(np.percentile(feature, 75))
            }
        return stats_dict
    
    def detect_drift(self, new_features: np.ndarray, 
                    method: str = "kolmogorov_smirnov") -> Tuple[DriftLevel, Dict[str, Any]]:
        """
        Detect data drift in new features
        
        Args:
            new_features: New data (shape: n_samples x n_features)
            method: Detection method ("kolmogorov_smirnov", "wasserstein", or "kl_divergence")
        
        Returns:
            drift_level, details dict
        """
        
        drift_scores = []
        feature_drifts = {}
        
        for i in range(new_features.shape[1]):
            new_feature = new_features[:, i]
            
            if method == "kolmogorov_smirnov":
                # Kolmogorov-Smirnov test
                statistic, p_value = stats.ks_2samp(self.baseline_features[:, i], new_feature)
                drift_score = statistic  # 0 to 1, higher = more drift
            
            elif method == "wasserstein":
                # Wasserstein distance (Earth Mover's Distance)
                drift_score = stats.wasserstein_distance(
                    self.baseline_features[:, i], 
                    new_feature
                )
                # Normalize by feature range
                feature_range = self.feature_stats[i]['max'] - self.feature_stats[i]['min']
                if feature_range > 0:
                    drift_score = drift_score / feature_range
            
            else:  # kl_divergence
                drift_score = self._kl_divergence(
                    self.baseline_features[:, i],
                    new_feature
                )
            
            drift_scores.append(drift_score)
            feature_drifts[f"feature_{i}"] = {
                'drift_score': float(drift_score),
                'new_mean': float(np.mean(new_feature)),
                'baseline_mean': float(self.feature_stats[i]['mean']),
                'mean_shift': float(np.mean(new_feature) - self.feature_stats[i]['mean'])
            }
        
        # Aggregate drift score
        avg_drift = np.mean(drift_scores)
        max_drift = np.max(drift_scores)
        
        # Determine drift level
        if avg_drift < self.threshold * 0.5:
            drift_level = DriftLevel.NO_DRIFT
        elif avg_drift < self.threshold:
            drift_level = DriftLevel.LOW_DRIFT
        elif avg_drift < self.threshold * 2:
            drift_level = DriftLevel.MODERATE_DRIFT
        else:
            drift_level = DriftLevel.HIGH_DRIFT
        
        details = {
            'drift_level': drift_level.value,
            'avg_drift_score': float(avg_drift),
            'max_drift_score': float(max_drift),
            'threshold': self.threshold,
            'method': method,
            'feature_drifts': feature_drifts,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return drift_level, details
    
    @staticmethod
    def _kl_divergence(baseline: np.ndarray, new: np.ndarray, bins: int = 50) -> float:
        """Calculate KL divergence between two distributions"""
        
        # Create histograms
        min_val = min(baseline.min(), new.min())
        max_val = max(baseline.max(), new.max())
        
        baseline_hist, _ = np.histogram(baseline, bins=bins, range=(min_val, max_val))
        new_hist, _ = np.histogram(new, bins=bins, range=(min_val, max_val))
        
        # Normalize
        baseline_hist = baseline_hist / baseline_hist.sum()
        new_hist = new_hist / new_hist.sum()
        
        # Calculate KL divergence (handling zeros)
        epsilon = 1e-10
        baseline_hist = baseline_hist + epsilon
        new_hist = new_hist + epsilon
        
        kl_div = np.sum(new_hist * np.log(new_hist / baseline_hist))
        
        return float(kl_div)

# ============================================================================
# Model Drift Detection (Performance Degradation)
# ============================================================================

class ModelDriftDetector:
    """Detect performance degradation over time (model drift)"""
    
    def __init__(self, baseline_metric: float, threshold_percent: float = 10.0):
        """
        Initialize with baseline metric
        
        Args:
            baseline_metric: Baseline accuracy/RMSE from validation set
            threshold_percent: Threshold for performance degradation in percentage
        """
        self.baseline_metric = baseline_metric
        self.threshold_percent = threshold_percent
        self.recent_metrics = []
    
    def record_metric(self, metric_value: float):
        """Record a metric value"""
        self.recent_metrics.append(metric_value)
    
    def detect_drift(self, window_size: int = 100) -> Tuple[bool, Dict[str, Any]]:
        """
        Detect model performance drift
        
        Returns:
            is_drifted, details dict
        """
        
        if len(self.recent_metrics) < window_size:
            window_size = len(self.recent_metrics)
        
        if window_size == 0:
            return False, {'status': 'insufficient_data'}
        
        recent = np.array(self.recent_metrics[-window_size:])
        current_mean = np.mean(recent)
        current_std = np.std(recent)
        
        # For error metrics (RMSE, MAE): higher is worse
        # For accuracy metrics: lower is worse
        # Assuming error metric here
        degradation_percent = ((current_mean - self.baseline_metric) / 
                               (self.baseline_metric + 1e-10)) * 100
        
        is_drifted = degradation_percent > self.threshold_percent
        
        details = {
            'is_drifted': is_drifted,
            'baseline_metric': float(self.baseline_metric),
            'current_mean': float(current_mean),
            'current_std': float(current_std),
            'degradation_percent': float(degradation_percent),
            'threshold_percent': self.threshold_percent,
            'window_size': window_size,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return is_drifted, details

# ============================================================================
# Alert Generator
# ============================================================================

class AlertGenerator:
    """Generate alerts based on monitoring metrics"""
    
    @staticmethod
    def generate_alerts(performance: Dict[str, float], 
                       data_drift: Dict[str, Any],
                       model_drift: Dict[str, Any]) -> list:
        """Generate alerts based on thresholds"""
        
        alerts = []
        
        # Performance alerts
        if performance.get('p99_latency_ms', 0) > 1000:
            alerts.append({
                'level': 'WARNING',
                'type': 'LATENCY_HIGH',
                'message': f"P99 latency {performance['p99_latency_ms']:.0f}ms exceeds 1000ms"
            })
        
        # Data drift alerts
        if data_drift.get('drift_level') == DriftLevel.HIGH_DRIFT.value:
            alerts.append({
                'level': 'CRITICAL',
                'type': 'DATA_DRIFT_HIGH',
                'message': f"High data drift detected (score: {data_drift.get('avg_drift_score'):.3f)})"
            })
        elif data_drift.get('drift_level') == DriftLevel.MODERATE_DRIFT.value:
            alerts.append({
                'level': 'WARNING',
                'type': 'DATA_DRIFT_MODERATE',
                'message': f"Moderate data drift detected (score: {data_drift.get('avg_drift_score'):.3f})"
            })
        
        # Model drift alerts
        if model_drift.get('is_drifted'):
            alerts.append({
                'level': 'CRITICAL',
                'type': 'MODEL_DRIFT',
                'message': f"Model performance degraded by {model_drift.get('degradation_percent'):.1f}%"
            })
        
        return alerts

# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Example: Data drift detection
    baseline = np.random.randn(1000, 10)  # Baseline data
    
    # Scenario 1: No drift
    no_drift_data = np.random.randn(500, 10)
    detector = DataDriftDetector(baseline)
    level, details = detector.detect_drift(no_drift_data)
    print(f"Scenario 1 - No drift: {level.value}, Score: {details['avg_drift_score']:.3f}")
    
    # Scenario 2: With drift
    drift_data = np.random.randn(500, 10) + 2  # Shifted distribution
    level, details = detector.detect_drift(drift_data)
    print(f"Scenario 2 - With drift: {level.value}, Score: {details['avg_drift_score']:.3f}")
