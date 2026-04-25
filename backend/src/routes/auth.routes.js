import bcrypt from 'bcrypt';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { authenticate, signAccessToken } from '../middleware/auth.js';
import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeEmail, splitFullName } from '../utils/formatters.js';
import { HttpError } from '../utils/httpError.js';
import { ensureFields } from '../utils/validation.js';

const router = express.Router();

async function generateCandidateCode(client) {
  const { rows } = await client.query(
    `
      SELECT COALESCE(
        MAX(NULLIF(REGEXP_REPLACE(candidate_code, '\\D', '', 'g'), '')::INTEGER),
        100
      ) AS max_code
      FROM candidate_profiles
    `,
  );

  return `CND-${String(Number(rows[0].max_code) + 1).padStart(3, '0')}`;
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['fullName', 'email', 'password']);

    const email = normalizeEmail(req.body.email);
    const requestedRole = req.body.role ?? 'candidate';

    if (requestedRole !== 'candidate') {
      throw new HttpError(403, 'Self-registration is only available for candidate accounts');
    }

    const passwordHash = await bcrypt.hash(req.body.password, env.bcryptRounds);
    const { firstName, lastName } = splitFullName(req.body.fullName);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingUser = await client.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);

      if (existingUser.rows.length > 0) {
        throw new HttpError(409, 'A user with this email already exists');
      }

      const userId = randomUUID();
      const profileId = randomUUID();
      const candidateCode = await generateCandidateCode(client);

      await client.query(
        `
          INSERT INTO users (id, full_name, email, password_hash, role, department, phone)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          userId,
          req.body.fullName,
          email,
          passwordHash,
          'candidate',
          'Nomzodlar bazasi',
          req.body.phone ?? null,
        ],
      );

      await client.query(
        `
          INSERT INTO candidate_profiles (
            id,
            user_id,
            candidate_code,
            first_name,
            last_name,
            gender,
            birth_place,
            photo_url,
            phone,
            connections
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          profileId,
          userId,
          candidateCode,
          req.body.firstName ?? firstName,
          req.body.lastName ?? lastName,
          req.body.gender ?? null,
          req.body.birthPlace ?? null,
          req.body.photoUrl ?? null,
          req.body.phone ?? null,
          JSON.stringify(Array.isArray(req.body.connections) ? req.body.connections : []),
        ],
      );

      await client.query('COMMIT');

      const user = {
        id: userId,
        fullName: req.body.fullName,
        email,
        role: 'candidate',
        department: 'Nomzodlar bazasi',
        phone: req.body.phone ?? null,
      };

      res.status(201).json({
        token: signAccessToken(user),
        user,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['email', 'password']);

    const email = normalizeEmail(req.body.email);
    const { rows } = await query(
      `
        SELECT id, full_name, email, password_hash, role, department, phone, is_active
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    if (rows.length === 0 || !rows[0].is_active) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(req.body.password, rows[0].password_hash);

    if (!passwordMatches) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const user = {
      id: rows[0].id,
      fullName: rows[0].full_name,
      email: rows[0].email,
      role: rows[0].role,
      department: rows[0].department,
      phone: rows[0].phone,
    };

    res.json({
      token: signAccessToken(user),
      user,
    });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

export default router;
