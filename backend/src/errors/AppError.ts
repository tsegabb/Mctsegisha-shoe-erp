export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Authentication required') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'You do not have permission to perform this action') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Resource not found') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string, details?: unknown) => new AppError(409, msg, 'CONFLICT', details);
export const unprocessable = (msg: string, details?: unknown) => new AppError(422, msg, 'UNPROCESSABLE', details);
export const insufficientStock = (details?: unknown) =>
  new AppError(409, 'Insufficient stock', 'INSUFFICIENT_STOCK', details);
