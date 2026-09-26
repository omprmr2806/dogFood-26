import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const errorCode = 'code' in err ? err.code : 'INTERNAL_SERVER_ERROR';

  // Safe error logging
  if (statusCode >= 500) {
    console.error('[UNHANDLED_ERROR]', {
      name: err.name,
      message: err.message,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  // Safe response to client
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: statusCode >= 500 && env.NODE_ENV === 'production' 
        ? 'An unexpected internal server error occurred.'
        : err.message,
      ...(env.NODE_ENV !== 'production' && 'details' in err ? { details: err.details } : {})
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
