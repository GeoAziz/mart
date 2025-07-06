import { logger } from './logging-service';
import { cacheService } from './caching-service';
import { errorHandler } from './error-handling-service';
import * as tf from '@tensorflow/tfjs-node';

export class MLService {
  private static instance: MLService;
  private models: Map<string, tf.LayersModel>;

  private constructor() {
    this.models = new Map();
    this.initializeModels();
  }

  static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  private async initializeModels(): Promise<void> {
    try {
      // Initialize sales prediction model
      const salesModel = await this.createSalesPredictionModel();
      this.models.set('sales_prediction', salesModel);

      // Initialize inventory optimization model
      const inventoryModel = await this.createInventoryOptimizationModel();
      this.models.set('inventory_optimization', inventoryModel);

      // Initialize customer segmentation model
      const segmentationModel = await this.createCustomerSegmentationModel();
      this.models.set('customer_segmentation', segmentationModel);

      logger.info('ML models initialized successfully');
    } catch (error) {
      errorHandler.handleError(error, { context: 'ML model initialization' });
    }
  }

  private async createSalesPredictionModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [30, 5] // 30 days of history, 5 features
    }));
    
    model.add(tf.layers.dropout(0.2));
    model.add(tf.layers.lstm({ units: 32 }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return model;
  }

  private async createInventoryOptimizationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [10] // 10 features for inventory optimization
    }));
    
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.rmsprop(0.001),
      loss: 'meanSquaredError'
    });

    return model;
  }

  private async createCustomerSegmentationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [20] // 20 customer features
    }));
    
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 4, activation: 'softmax' })); // 4 customer segments

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async predictSales(historicalData: number[][]): Promise<number> {
    try {
      const model = this.models.get('sales_prediction');
      if (!model) throw new Error('Sales prediction model not initialized');

      const tensor = tf.tensor3d([historicalData]);
      const prediction = await model.predict(tensor) as tf.Tensor;
      const result = await prediction.data();
      
      return result[0];
    } catch (error) {
      errorHandler.handleError(error, { context: 'Sales prediction' });
      throw error;
    }
  }

  async optimizeInventory(features: number[]): Promise<number> {
    try {
      const model = this.models.get('inventory_optimization');
      if (!model) throw new Error('Inventory optimization model not initialized');

      const tensor = tf.tensor2d([features]);
      const prediction = await model.predict(tensor) as tf.Tensor;
      const result = await prediction.data();
      
      return result[0];
    } catch (error) {
      errorHandler.handleError(error, { context: 'Inventory optimization' });
      throw error;
    }
  }

  async segmentCustomer(features: number[]): Promise<number> {
    try {
      const model = this.models.get('customer_segmentation');
      if (!model) throw new Error('Customer segmentation model not initialized');

      const tensor = tf.tensor2d([features]);
      const prediction = await model.predict(tensor) as tf.Tensor;
      const result = await prediction.data();
      
      return Array.from(result).indexOf(Math.max(...Array.from(result)));
    } catch (error) {
      errorHandler.handleError(error, { context: 'Customer segmentation' });
      throw error;
    }
  }
}

export const mlService = MLService.getInstance();
