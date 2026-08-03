/**
 * MLOps Inference Client
 * HTTP wrapper for calling MLOps FastAPI inference service
 * Used by ZilaCart app to get model predictions
 */

import { logger } from './logging-service';
import { syncCache as cacheService } from '@/lib/cache-service';

interface DemandForecastRequest {
  vendor_id: string;
  product_id: string;
  days_ahead?: number;
  features?: Record<string, number>;
  model_version?: string;
}

interface DemandForecastResponse {
  predicted_demand: number;
  confidence: number;
  model_version: string;
  model_name: string;
  latency_ms: number;
  drift_detected: boolean;
  timestamp: string;
}

interface RecommendationsRequest {
  customer_id: string;
  product_ids: string[];
  num_recommendations?: number;
  model_version?: string;
}

interface RecommendationsResponse {
  recommendations: Array<{
    product_id: string;
    score: number;
    rank: number;
  }>;
  scores: number[];
  model_version: string;
  model_name: string;
  latency_ms: number;
  timestamp: string;
}

interface FraudScoreRequest {
  order_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  features?: Record<string, number>;
}

interface FraudScoreResponse {
  fraud_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  model_version: string;
  model_name: string;
  latency_ms: number;
  timestamp: string;
}

interface ModelInfo {
  name: string;
  version: string;
  status: string;
  accuracy?: number;
  last_updated: string;
  artifact_uri: string;
}

export class MLOpsInferenceClient {
  private baseUrl: string;
  private timeout: number;
  private useEmbedded: boolean;

  constructor(
    baseUrl = process.env.MLOPS_INFERENCE_API || 'http://localhost:8001',
    useEmbedded = process.env.USE_EMBEDDED_ML === 'true'
  ) {
    this.baseUrl = baseUrl;
    this.timeout = 10000; // 10 second timeout
    this.useEmbedded = useEmbedded;
  }

  /**
   * Check if inference service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });
      return response.ok;
    } catch (error) {
      logger.debug('Inference service unavailable:', error);
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Failed to fetch models:', error);
      throw error;
    }
  }

  /**
   * Get specific model details
   */
  async getModelInfo(modelName: string): Promise<ModelInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/models/${modelName}`, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Failed to fetch model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Predict demand forecast
   */
  async predictDemandForecast(
    request: DemandForecastRequest,
    options?: { useCache?: boolean; cacheTTL?: number }
  ): Promise<DemandForecastResponse> {
    // Check cache first
    if (options?.useCache !== false) {
      const cacheKey = `demand-forecast:${request.vendor_id}:${request.product_id}`;
      const cached = cacheService.get<DemandForecastResponse>(cacheKey);
      if (cached) {
        logger.debug('Using cached demand forecast');
        return cached;
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/predict/demand-forecast`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data: DemandForecastResponse = await response.json();

      // Cache successful response
      if (options?.useCache !== false) {
        const cacheKey = `demand-forecast:${request.vendor_id}:${request.product_id}`;
        cacheService.set(cacheKey, data, options?.cacheTTL || 3600);
      }

      return data;
    } catch (error) {
      logger.error('Demand forecast prediction failed:', error);
      throw error;
    }
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(
    request: RecommendationsRequest
  ): Promise<RecommendationsResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/predict/recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Recommendations prediction failed:', error);
      throw error;
    }
  }

  /**
   * Score order for fraud risk
   */
  async getFraudScore(request: FraudScoreRequest): Promise<FraudScoreResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/predict/fraud-score`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Fraud score prediction failed:', error);
      throw error;
    }
  }

  /**
   * Promote model version to new stage
   * Admin-only endpoint
   */
  async promoteModel(
    modelName: string,
    version: string,
    stage: 'Production' | 'Staging' | 'Archived'
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/${modelName}/promote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MLOPS_ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ version, stage }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      logger.info(`Model ${modelName} promoted to ${stage}`);
      return await response.json();
    } catch (error) {
      logger.error('Model promotion failed:', error);
      throw error;
    }
  }

  /**
   * Get metrics for a model
   */
  async getModelMetrics(modelName: string): Promise<Record<string, any>> {
    try {
      const info = await this.getModelInfo(modelName);
      if (!info) throw new Error(`Model not found: ${modelName}`);

      // Parse metrics from info
      return {
        name: info.name,
        version: info.version,
        status: info.status,
        accuracy: info.accuracy,
        last_updated: info.last_updated,
      };
    } catch (error) {
      logger.error('Failed to get model metrics:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const mlOpsClient = new MLOpsInferenceClient();

/**
 * Fallback wrapper for graceful degradation
 * Falls back to embedded service if inference service is down
 */
export async function predictWithFallback(
  prediction: 'demand' | 'recommendations' | 'fraud',
  request: any,
  fallbackFn?: () => Promise<any>
): Promise<any> {
  try {
    // Check if service is available
    const available = await mlOpsClient.isAvailable();
    if (!available && fallbackFn) {
      logger.warn('Inference service unavailable, using embedded ML service');
      return await fallbackFn();
    }

    // Call appropriate prediction method
    switch (prediction) {
      case 'demand':
        return await mlOpsClient.predictDemandForecast(request);
      case 'recommendations':
        return await mlOpsClient.getRecommendations(request);
      case 'fraud':
        return await mlOpsClient.getFraudScore(request);
      default:
        throw new Error(`Unknown prediction type: ${prediction}`);
    }
  } catch (error) {
    logger.error(`Prediction failed (${prediction}):`, error);

    // Fall back to embedded service if available
    if (fallbackFn) {
      logger.warn('Falling back to embedded ML service');
      return await fallbackFn();
    }

    throw error;
  }
}
