import winston from 'winston';
import { format } from 'winston';

class LoggingService {
  private static instance: LoggingService;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: { service: 'mart-analytics' },
      transports: [
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'error.log', 
          level: 'error',
          dirname: 'logs' 
        }),
        new winston.transports.File({ 
          filename: 'combined.log',
          dirname: 'logs'
        })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      }));
    }
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
