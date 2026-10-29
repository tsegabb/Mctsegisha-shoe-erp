import { Response } from 'express';

function sanitizeErrorMessage(rawError: any, status: number): string {
  let message = typeof rawError === 'string' ? rawError : rawError?.message;

  if (!message || typeof message !== 'string') {
    return 'Unable to complete the request. Please try again.';
  }

  // Patterns that indicate sensitive internal or database details
  const sensitivePatterns = [
    /select\s+/i, /insert\s+/i, /update\s+/i, /delete\s+/i, /drop\s+/i, /alter\s+/i,
    /pg_/i, /drizzle/i, /econnrefused/i, /etimedout/i, /postgres/i, /sql/i, /syntax error/i,
    /node_modules/i, /at\s+[\w\.\/\\:]+:\d+/i, /bearer/i, /jwt/i, /password/i, /secret/i,
    /column\s+".*"\s+does not exist/i, /relation\s+".*"\s+does not exist/i, /unique constraint/i,
    /foreign key constraint/i, /duplicate key/i, /violates/i
  ];

  const containsSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(message));

  if (containsSensitiveInfo) {
    if (/duplicate key|unique constraint/i.test(message)) {
      return 'A record with this information already exists.';
    }
    return 'Unable to complete the request. Please try again.';
  }

  if (status >= 500 && !message.includes('Please try again')) {
    return 'Unable to complete the request. Please try again.';
  }

  return message;
}

export const apiResponse = {
  success: (res: Response, data: any, status = 200, message = 'Operation successful') => {
    return res.status(status).json({
      success: true,
      message,
      data
    });
  },
  
  error: (res: Response, error: any, status = 500) => {
    const cleanError = sanitizeErrorMessage(error, status);
    return res.status(status).json({
      success: false,
      error: cleanError
    });
  }
};

