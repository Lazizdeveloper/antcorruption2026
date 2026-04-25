import { HttpError } from './httpError.js';

export function ensureFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new HttpError(400, `Missing required fields: ${missing.join(', ')}`);
  }
}
