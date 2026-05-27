import type { ApiErrorResponse, FieldError } from '../types/index'

/**
 * HTTP status text mapping for error responses.
 */
const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

/**
 * Base application error class.
 * All custom errors extend this class and can be mapped to structured API responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: FieldError[],
  ) {
    super(message)
    this.name = 'AppError'
    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Converts the error to a structured API error response.
   */
  toResponse(requestId: string): ApiErrorResponse {
    const response: ApiErrorResponse = {
      requestId,
      statusCode: this.statusCode,
      error: HTTP_STATUS_TEXT[this.statusCode] ?? 'Unknown Error',
      message: this.message,
    }

    if (this.details && this.details.length > 0) {
      response.errors = this.details
    }

    return response
  }
}

/**
 * Validation error (HTTP 400).
 * Includes field-level errors identifying each invalid field and the validation rule that failed.
 */
export class ValidationError extends AppError {
  constructor(errors: FieldError[]) {
    // Cap at 50 entries per requirement 19.2
    const cappedErrors = errors.slice(0, 50)
    super(400, 'VALIDATION_ERROR', 'Validation failed', cappedErrors)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error (HTTP 404).
 * Used when a requested resource does not exist or when cross-tenant access is attempted.
 */
export class NotFoundError extends AppError {
  constructor(entityType: string, _entityId?: string) {
    super(404, 'NOT_FOUND', `${entityType} not found`)
    this.name = 'NotFoundError'
  }
}

/**
 * Forbidden error (HTTP 403).
 * Used when an authenticated user lacks permission for the requested action.
 * Does not reveal what permissions are required.
 */
export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'FORBIDDEN', 'Insufficient permissions')
    this.name = 'ForbiddenError'
  }
}

/**
 * Conflict error (HTTP 409).
 * Used for duplicate resource conflicts (e.g., duplicate email, duplicate building name).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message)
    this.name = 'ConflictError'
  }
}

/**
 * Rate limit error (HTTP 429).
 * Used when a client exceeds the allowed request rate.
 * Includes an optional retryAfter value in seconds.
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter = 60) {
    super(429, 'RATE_LIMITED', 'Too many attempts, please try again later')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}
