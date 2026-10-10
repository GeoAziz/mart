import winston from 'winston';
import { format } from 'winston';
import LokiTransport from 'winston-loki';

class LoggingService {
  private static instance: LoggingService;
  private logger: winston.Logger;

  private constructor() {
    const lokiUrl = process.env.LOKI_URL;
    const transports: winston.transport[] = [
      new winston.transports.File({ 
        filename: 'error.log', 
        level: 'error',
        dirname: 'logs' 
      }),
      new winston.transports.File({ 
        filename: 'combined.log',
        dirname: 'logs'
      }),
    ];

    // Forward structured logs to Loki when configured (monitoring profile).
    if (lokiUrl) {
      transports.push(
        new LokiTransport({
          host: lokiUrl,
          labels: { service: 'mart-app' },
          json: true,
          batching: true,
          interval: 5,
        })
      );
    }

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: { service: 'mart-analytics' },
      transports,
    });
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }
}

export const logger = LoggingService.getInstance();
