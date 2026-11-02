import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';
import { AppError } from '../core/errors';

type Target = 'json' | 'query' | 'param' | 'form';

/** zValidator that throws our AppError so every 400 has the same shape. */
export const validate = <T extends ZodType, K extends Target>(target: K, schema: T) =>
  zValidator(target, schema, (result) => {
    if (!result.success) throw new AppError('Invalid input', 400, 'VALIDATION', result.error.issues);
  });
