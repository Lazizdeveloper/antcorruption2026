import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { mapAnomalyRow, mapApplicationRow, mapHrApplicationRow, mapHrProfile } from '../db/mappers.js';
import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildConflictHireAnomalyMessage,
  shouldCreateRiskyHireAlert,
  upsertConflictHireReport,
} from '../utils/conflictHire.js';
import { toCsv } from '../utils/csv.js';
import { HttpError } from '../utils/httpError.js';
import { deleteLocalUploadFromUrl } from '../utils/uploads.js';
import { ensureFields, isValidPhoneNumber } from '../utils/validation.js';

const router = express.Router();

router.use(authenticate, requireRoles('hr', 'admin'));

async function getHrProfileAndUser(userId, required = true) {
  const { rows } = await query(
    `
      SELECT
        hp.*,
        u.email,
        u.phone,
        u.avatar_url
      FROM hr_profiles hp
      INNER JOIN users u ON u.id = hp.user_id
      WHERE hp.user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (rows.length === 0) {
    if (!required) {
      return null;
    }

    throw new HttpError(404, 'HR profile not found');
  }

  return rows[0];
}

async function getHrAuditContext(client, userId) {
  const { rows } = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        hp.first_name,
        hp.last_name,
        hp.middle_name,
        hp.passport_number,
        hp.passport_pinfl
      FROM users u
      LEFT JOIN hr_profiles hp ON hp.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'HR user not found');
  }

  return rows[0];
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [profileRow, applicationResult, anomalyResult] = await Promise.all([
      getHrProfileAndUser(req.user.id, false),
      query(
        `
          SELECT *
          FROM applications
          ORDER BY submitted_at DESC
        `,
      ),
      query(
        `
          SELECT *
          FROM anomalies
          ORDER BY created_at DESC
          LIMIT 20
        `,
      ),
    ]);

    const applications = applicationResult.rows.map(mapHrApplicationRow);
    const totalApplications = applications.length;
    const averageScore =
      totalApplications === 0
        ? 0
        : Number(
            (
              applications.reduce((sum, application) => sum + application.score, 0) /
              totalApplications
            ).toFixed(1),
          );

    res.json({
      summary: {
        totalApplications,
        pendingCount: applications.filter((application) => application.status === 'pending').length,
        shortlistedCount: applications.filter((application) => application.status === 'shortlisted').length,
        hiredCount: applications.filter((application) => application.status === 'hired').length,
        averageScore,
      },
      profile: profileRow
        ? mapHrProfile(profileRow, {
            email: profileRow.email,
            phone: profileRow.phone,
            avatarUrl: profileRow.avatar_url,
          })
        : null,
      applications,
      anomalies: anomalyResult.rows.map(mapAnomalyRow),
    });
  }),
);

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const profileRow = await getHrProfileAndUser(req.user.id);

    res.json({
      profile: mapHrProfile(profileRow, {
        email: profileRow.email,
        phone: profileRow.phone,
        avatarUrl: profileRow.avatar_url,
      }),
    });
  }),
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const profileRow = await getHrProfileAndUser(req.user.id);
    ensureFields(req.body, [
      'firstName',
      'lastName',
      'middleName',
      'phone',
      'passportNumber',
      'passportPinfl',
    ]);

    const phone = String(req.body.phone).trim();
    const passportNumber = String(req.body.passportNumber).trim().toUpperCase();
    const passportPinfl = String(req.body.passportPinfl).trim();

    if (!isValidPhoneNumber(phone)) {
      throw new HttpError(400, "Telefon raqamini to'g'ri kiriting.");
    }

    if (!/^[A-Z0-9]{7,14}$/.test(passportNumber)) {
      throw new HttpError(400, "Passport ma'lumotini to'g'ri kiriting. Masalan: AA1234567.");
    }

    if (!/^\d{14}$/.test(passportPinfl)) {
      throw new HttpError(400, "JSHSHIR/PINFL 14 ta raqamdan iborat bo'lishi kerak.");
    }

    const client = await pool.connect();
    const nextPhotoUrl = req.body.photoUrl ?? profileRow.avatar_url ?? null;

    try {
      await client.query('BEGIN');
      const fullName = [
        String(req.body.firstName).trim(),
        String(req.body.lastName).trim(),
      ].filter(Boolean).join(' ');

      await client.query(
        `
          UPDATE users
          SET
            full_name = $1,
            phone = $2,
            avatar_url = $3,
            updated_at = NOW()
          WHERE id = $4
        `,
        [fullName, phone, nextPhotoUrl, req.user.id],
      );

      const { rows } = await client.query(
        `
          UPDATE hr_profiles
          SET
            first_name = $1,
            last_name = $2,
            middle_name = $3,
            passport_number = $4,
            passport_pinfl = $5,
            updated_at = NOW()
          WHERE user_id = $6
          RETURNING *
        `,
        [
          String(req.body.firstName).trim(),
          String(req.body.lastName).trim(),
          String(req.body.middleName).trim(),
          passportNumber,
          passportPinfl,
          req.user.id,
        ],
      );

      await client.query('COMMIT');

      if (nextPhotoUrl && nextPhotoUrl !== profileRow.avatar_url) {
        await deleteLocalUploadFromUrl(profileRow.avatar_url);
      }

      res.json({
        profile: mapHrProfile(rows[0], {
          email: profileRow.email,
          phone,
          avatarUrl: nextPhotoUrl,
        }),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT *
        FROM applications
        ORDER BY submitted_at DESC
      `,
    );

    const search = String(req.query.search ?? '').trim().toLowerCase();
    const status = String(req.query.status ?? '').trim();
    const department = String(req.query.department ?? '').trim();

    const filteredApplications = rows
      .map(mapHrApplicationRow)
      .filter((application) => {
        const matchesSearch =
          !search ||
          application.candidateName.toLowerCase().includes(search) ||
          application.candidateEmail.toLowerCase().includes(search) ||
          application.position.toLowerCase().includes(search) ||
          application.candidateCode.toLowerCase().includes(search);
        const matchesStatus = !status || application.status === status;
        const matchesDepartment = !department || application.department === department;

        return matchesSearch && matchesStatus && matchesDepartment;
      });

    res.json({
      applications: filteredApplications,
    });
  }),
);

router.get(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT *
        FROM applications
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id],
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Application not found');
    }

    res.json({
      application: mapHrApplicationRow(rows[0]),
    });
  }),
);

router.patch(
  '/applications/:id/status',
  asyncHandler(async (req, res) => {
    const allowedStatuses = new Set(['pending', 'reviewing', 'shortlisted', 'rejected', 'hired']);
    const nextStatus = String(req.body.status ?? '').trim();

    if (!allowedStatuses.has(nextStatus)) {
      throw new HttpError(400, 'Invalid status value');
    }

    const stageByStatus = {
      pending: 'submitted',
      reviewing: 'merit_test',
      shortlisted: 'ranking',
      rejected: 'completed',
      hired: 'completed',
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const applicationResult = await client.query(
        `
          SELECT *
          FROM applications
          WHERE id = $1
          FOR UPDATE
        `,
        [req.params.id],
      );

      if (applicationResult.rows.length === 0) {
        throw new HttpError(404, 'Application not found');
      }

      const application = applicationResult.rows[0];
      const recruiterInfo =
        nextStatus === 'shortlisted' || nextStatus === 'hired'
          ? req.user.fullName
          : application.recruiter_info;

      const updateResult = await client.query(
        `
          UPDATE applications
          SET
            review_status = $1,
            candidate_stage = $2,
            recruiter_info = $3,
            updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `,
        [nextStatus, stageByStatus[nextStatus], recruiterInfo, req.params.id],
      );

      const shouldCreateAnomaly =
        nextStatus === 'hired' && shouldCreateRiskyHireAlert(application);

      if (shouldCreateAnomaly) {
        await client.query(
          `
            INSERT INTO anomalies (id, application_id, type, message, severity, source)
            VALUES ($1, $2, 'CONTRARY_SELECTION', $3, 'high', 'HR status update')
            ON CONFLICT (application_id, type, message)
            DO NOTHING
          `,
          [randomUUID(), req.params.id, buildConflictHireAnomalyMessage(application)],
        );
      }

      if (nextStatus === 'hired' && shouldCreateRiskyHireAlert(application)) {
        const hrContext = await getHrAuditContext(client, req.user.id);
        await upsertConflictHireReport({
          client,
          applicationId: req.params.id,
          application: updateResult.rows[0],
          hrContext,
          createdByUserId: req.user.id,
        });
      }

      await client.query('COMMIT');

      res.json({
        application: mapHrApplicationRow(updateResult.rows[0]),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.get(
  '/anomalies',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT *
        FROM anomalies
        ORDER BY created_at DESC
      `,
    );

    res.json({
      anomalies: rows.map(mapAnomalyRow),
    });
  }),
);

router.get(
  '/export/applications.csv',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT *
        FROM applications
        ORDER BY submitted_at DESC
      `,
    );

    const applications = rows.map(mapHrApplicationRow);
    const csv = toCsv([
      [
        'id',
        'candidate_code',
        'candidate_name',
        'candidate_email',
        'position',
        'department',
        'status',
        'candidate_stage',
        'score',
        'merit_score',
        'conflict_detected',
        'recruiter_info',
      ],
      ...applications.map((application) => [
        application.id,
        application.candidateCode,
        application.candidateName,
        application.candidateEmail,
        application.position,
        application.department,
        application.status,
        application.candidateStage,
        application.score,
        application.meritScore,
        application.conflictDetected,
        application.recruiterInfo,
      ]),
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hr-applications.csv"');
    res.send(csv);
  }),
);

export default router;
