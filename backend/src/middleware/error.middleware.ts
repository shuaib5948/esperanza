import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Unhandled server error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  return ApiResponse.error(res, code, message, statusCode);
}
