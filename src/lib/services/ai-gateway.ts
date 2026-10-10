import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { createApiError, ErrorCodes } from '@/lib/api-errors';

/**
 * AI Gateway Service
 * Centralizes rate limiting, cost tracking, and observability for all Genkit flows.
 */

interface AICallMetadata {
  userId: string;
  flowName: string;
  model: string;
  tokensUsed?: number;
  cost?: number;
}

const AI_USAGE_COLLECTION = 'ai_usage_logs';
const AI_COST_PER_TOKEN = 0.00002; // Hypothetical blended cost

export class AIGateway {
  /**
   * Execute an AI flow handler with tracking and governance.
   * 
   * @param flowName Unique name for the flow for logging and metrics.
   * @param input Input data for the flow.
   * @param userId User context for rate limiting.
   * @param flowHandler The actual async function that implements the flow.
   */
  static async executeFlow<TInput, TOutput>(
    flowName: string,
    input: TInput,
    userId: string,
    flowHandler: (input: TInput) => Promise<TOutput>
  ): Promise<TOutput> {
    const startTime = Date.now();
    
    // 1. Rate Limiting
    await this.checkRateLimit(userId, flowName);

    try {
      // 2. Execute flow
      const result = await flowHandler(input);
      
      // 3. Track usage (async, non-blocking)
      const duration = Date.now() - startTime;
      this.logUsage({
        userId,
        flowName,
        model: 'gemini-1.5-flash', // Default for now
      }, duration).catch(console.error);

      return result;
    } catch (error) {
      console.error(`AI Gateway Error [${flowName}]:`, error);
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        `AI service failed: ${flowName}`,
        502
      );
    }
  }

  private static async checkRateLimit(userId: string, flowName: string) {
    // Implementation for Redis-based per-user rate limiting could go here
    // e.g., block users from hitting chatbot > 100 times/hour
    return true;
  }

  private static async logUsage(metadata: AICallMetadata, duration: number) {
    const cost = (metadata.tokensUsed || 0) * AI_COST_PER_TOKEN;
    
    await db.collection(AI_USAGE_COLLECTION).add({
      ...metadata,
      cost,
      duration,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
