import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { mapAnomalyRow, mapApplicationRow } from '../db/mappers.js';
import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toCsv } from '../utils/csv.js';
import { HttpError } from '../utils/httpError.js';

const router = express.Router();

router.use(authenticate, requireRoles('hr', 'admin'));

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [applicationResult, anomalyResult] = await Promise.all([
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

    const applications = applicationResult.rows.map(mapApplicationRow);
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
      applications,
      anomalies: anomalyResult.rows.map(mapAnomalyRow),
    });
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
      .map(mapApplicationRow)
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
      application: mapApplicationRow(rows[0]),
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
        nextStatus === 'hired' &&
        application.conflict_detected &&
        Number(application.score) < 50;

      if (shouldCreateAnomaly) {
        await client.query(
          `
            INSERT INTO anomalies (id, application_id, type, message, severity, source)
            VALUES ($1, $2, 'CONTRARY_SELECTION', $3, 'high', 'HR status update')
            ON CONFLICT (application_id, type, message)
            DO NOTHING
          `,
          [
            randomUUID(),
            req.params.id,
            `${application.candidate_name} past ball va konflikt qaydiga qaramay hired holatiga o‘tkazildi.`,
          ],
        );
      }

      await client.query('COMMIT');

      res.json({
        application: mapApplicationRow(updateResult.rows[0]),
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

    const applications = rows.map(mapApplicationRow);
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
