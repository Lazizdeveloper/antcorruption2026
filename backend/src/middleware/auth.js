import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: '7d',
    },
  );
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authorization token is required');
  }

  const token = header.slice('Bearer '.length).trim();
  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const { rows } = await query(
    `
      SELECT id, full_name, email, role, department, phone, is_active
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [payload.sub],
  );

  if (rows.length === 0 || !rows[0].is_active) {
    throw new HttpError(401, 'User not found or inactive');
  }

  req.user = {
    id: rows[0].id,
    fullName: rows[0].full_name,
    email: rows[0].email,
    role: rows[0].role,
    department: rows[0].department,
    phone: rows[0].phone,
  };

  next();
});

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to access this resource'));
    }

    next();
  };
}
