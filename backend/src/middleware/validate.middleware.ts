import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../utils/response.js';

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce((acc: Record<string, string>, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {});

        return ApiResponse.error(res, 'VALIDATION_ERROR', 'Input validation failed', 422, details);
      }
      return ApiResponse.error(res, 'BAD_REQUEST', 'Invalid request data', 400);
    }
  };
}
