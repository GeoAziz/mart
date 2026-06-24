import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    timestamp: string;
  };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  INVENTORY_ERROR: 'INVENTORY_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export function formatApiError(error: unknown): {
  response: NextResponse<ApiErrorResponse>;
  statusCode: number;
} {
  const timestamp = new Date().toISOString();

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(err.message);
    });

    return {
      statusCode: 400,
      response: NextResponse.json(
        {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Validation failed',
            details,
            timestamp,
          },
        },
        { status: 400 }
      ),
    };
  }

  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      response: NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp,
          },
        },
        { status: error.statusCode }
      ),
    };
  }

  console.error('Unhandled error:', error);

  return {
    statusCode: 500,
    response: NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Internal server error',
          timestamp,
        },
      },
      { status: 500 }
    ),
  };
}

export function createApiError(
  code: string,
  message: string,
  statusCode: number,
  details?: Record<string, string[]>
): ApiError {
  return new ApiError(code, message, statusCode, details);
}
