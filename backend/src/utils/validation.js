import { HttpError } from './httpError.js';

export function ensureFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload?.[field];
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    );
  });

  if (missing.length > 0) {
    throw new HttpError(400, `Missing required fields: ${missing.join(', ')}`);
  }
}

export function isValidPhoneNumber(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^\+998\d{9}$/.test(value.trim());
}

export function normalizeTelegramUsername(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^@/, '');
}

export function isValidTelegramUsername(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^@[A-Za-z0-9_]{5,32}$/.test(value.trim());
}
