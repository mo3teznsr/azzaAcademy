/** Domain errors carry their own HTTP status so services stay framework-agnostic. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400,
    readonly code: string = 'BAD_REQUEST',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} ${id} not found` : `${entity} not found`, 404, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Sign in required', 401, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE', details?: unknown) {
    super(message, 422, code, details);
  }
}
