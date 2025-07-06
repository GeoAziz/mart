import { logger } from './logging-service';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  handleError(error: Error | ApplicationError, context?: any): void {
    if (error instanceof ApplicationError) {
      logger.error(`[${error.code}] ${error.message}`, {
        statusCode: error.statusCode,
        context: { ...error.context, ...context },
        stack: error.stack
      });
    } else {
      logger.error(error.message, {
        context,
        stack: error.stack
      });
    }

    // Could integrate with error monitoring services like Sentry here
    this.reportToMonitoring(error, context);
  }

  private reportToMonitoring(error: Error, context?: any): void {
    // Integration point for monitoring services
    // Example: Sentry.captureException(error, { extra: context });
  }
}

export const errorHandler = ErrorHandlingService.getInstance();
