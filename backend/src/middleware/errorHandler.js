import { isProduction } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const payload = {
    message: error.message || 'Internal server error',
  };

  if (error instanceof HttpError && error.details) {
    payload.details = error.details;
  }

  if (!isProduction && !(error instanceof HttpError)) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}
