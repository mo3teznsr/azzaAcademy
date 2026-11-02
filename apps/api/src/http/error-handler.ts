import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../core/errors';
import type { AppEnv } from './types';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: { code: 'VALIDATION', message: 'Invalid input', details: err.issues } }, 400);
  }
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP', message: err.message } }, err.status);
  }
  console.error(err);
  return c.json({ error: { code: 'INTERNAL', message: 'Something went wrong' } }, 500);
};
