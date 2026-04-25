import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  mapAdminProfile,
  mapCandidateCard,
  mapCaseRow,
  mapExternalProjectRow,
  mapIntegrityReport,
  mapNewsRow,
} from '../db/mappers.js';
import { buildAdminCandidateQuery } from '../db/adminCandidateQuery.js';
import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildAdminNotifications } from '../utils/adminNotifications.js';
import { formatMonthLabel, formatPotentialSavings } from '../utils/formatters.js';
import { HttpError } from '../utils/httpError.js';
import { deleteLocalUploadFromUrl } from '../utils/uploads.js';
import { ensureFields, isValidPhoneNumber } from '../utils/validation.js';
import { toCsv } from '../utils/csv.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin'));

const DASHBOARD_CANDIDATE_LIMIT = 10;
const CANDIDATE_LIST_LIMIT = 20;
const DASHBOARD_REPORT_NOTIFICATION_LIMIT = 4;
const DASHBOARD_CASE_NOTIFICATION_LIMIT = 3;
const DASHBOARD_ANOMALY_NOTIFICATION_LIMIT = 3;

async function getAdminProfile(userId) {
  const { rows } = await query(
    `
      SELECT id, full_name, email, phone, department, avatar_url
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'Admin profile not found');
  }

  return rows[0];
}

function buildRiskDistribution(cases) {
  const distribution = {
    Past: 0,
    'O‘rta': 0,
    Yuqori: 0,
  };

  for (const caseItem of cases) {
    if (caseItem.riskScore >= 75) {
      distribution['Yuqori'] += 1;
    } else if (caseItem.riskScore >= 40) {
      distribution['O‘rta'] += 1;
    } else {
      distribution['Past'] += 1;
    }
  }

  return [
    { name: 'Past', count: distribution.Past, fill: '#10b981' },
    { name: 'O‘rta', count: distribution['O‘rta'], fill: '#f59e0b' },
    { name: 'Yuqori', count: distribution['Yuqori'], fill: '#ef4444' },
  ];
}

function buildTimeline(rows) {
  const totals = new Map();

  for (const row of rows) {
    const monthLabel = formatMonthLabel(row.submitted_at);
    totals.set(monthLabel, (totals.get(monthLabel) ?? 0) + 1);
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .slice(-5);
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const candidateQuery = buildAdminCandidateQuery(DASHBOARD_CANDIDATE_LIMIT);
    const [
      casesResult,
      candidateResult,
      applicationResult,
      projectResult,
      newsResult,
      taxResult,
      reportNotificationResult,
      caseNotificationResult,
      anomalyNotificationResult,
      profileRow,
    ] =
      await Promise.all([
        query(
          `
            SELECT *
            FROM cases
            ORDER BY risk_score DESC, created_at DESC
          `,
        ),
        query(candidateQuery.text, candidateQuery.values),
        query(
          `
            SELECT submitted_at
            FROM applications
            ORDER BY submitted_at ASC
          `,
        ),
        query(
          `
            SELECT *
            FROM external_projects
            ORDER BY published_date DESC NULLS LAST, created_at DESC
          `,
        ),
        query(
          `
            SELECT *
            FROM news_items
            ORDER BY published_date DESC NULLS LAST, created_at DESC
          `,
        ),
        query(
          `
            SELECT region_name AS name, entities, individuals
            FROM regional_tax_stats
            ORDER BY region_name ASC
          `,
        ),
        query(
          `
            SELECT id, title, severity, created_at, details
            FROM integrity_reports
            ORDER BY created_at DESC
            LIMIT $1
          `,
          [DASHBOARD_REPORT_NOTIFICATION_LIMIT],
        ),
        query(
          `
            SELECT external_ref, created_at
            FROM cases
            WHERE risk_score >= 75
            ORDER BY created_at DESC
            LIMIT $1
          `,
          [DASHBOARD_CASE_NOTIFICATION_LIMIT],
        ),
        query(
          `
            SELECT id, message, severity, created_at
            FROM anomalies
            ORDER BY created_at DESC
            LIMIT $1
          `,
          [DASHBOARD_ANOMALY_NOTIFICATION_LIMIT],
        ),
        getAdminProfile(req.user.id),
      ]);

    const cases = casesResult.rows.map(mapCaseRow);
    const highRiskCases = cases.filter((caseItem) => caseItem.riskScore >= 75).length;
    const potentialSavings = cases.reduce((sum, caseItem) => sum + Number(caseItem.estimatedSavings ?? 0), 0);

    res.json({
      stats: {
        highRiskCases,
        totalCases: cases.length,
        potentialSavings: formatPotentialSavings(potentialSavings),
      },
      cases,
      candidates: candidateResult.rows.map(mapCandidateCard),
      riskDistribution: buildRiskDistribution(cases),
      timelineData: buildTimeline(applicationResult.rows),
      soliqGraphData: taxResult.rows,
      externalProjects: projectResult.rows.map(mapExternalProjectRow),
      newsItems: newsResult.rows.map(mapNewsRow),
      profile: mapAdminProfile(profileRow),
      notifications: buildAdminNotifications({
        reports: reportNotificationResult.rows,
        cases: caseNotificationResult.rows,
        anomalies: anomalyNotificationResult.rows,
      }),
    });
  }),
);

router.get(
  '/cases',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT *
        FROM cases
        ORDER BY risk_score DESC, created_at DESC
      `,
    );

    res.json({
      cases: rows.map(mapCaseRow),
    });
  }),
);

router.get(
  '/candidates',
  asyncHandler(async (req, res) => {
    const candidateQuery = buildAdminCandidateQuery(CANDIDATE_LIST_LIMIT);
    const { rows } = await query(candidateQuery.text, candidateQuery.values);

    res.json({
      candidates: rows.map(mapCandidateCard),
    });
  }),
);

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const profileRow = await getAdminProfile(req.user.id);

    res.json({
      profile: mapAdminProfile(profileRow),
    });
  }),
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['fullName']);

    const profileRow = await getAdminProfile(req.user.id);
    const fullName = String(req.body.fullName).trim();
    const phone = String(req.body.phone ?? '').trim();
    const photoUrl = req.body.photoUrl ?? profileRow.avatar_url ?? null;

    if (!fullName) {
      throw new HttpError(400, "Ism-familiyani to'g'ri kiriting.");
    }

    if (phone && !isValidPhoneNumber(phone)) {
      throw new HttpError(400, "Telefon raqamini to'g'ri kiriting.");
    }

    const { rows } = await query(
      `
        UPDATE users
        SET
          full_name = $1,
          phone = $2,
          avatar_url = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, full_name, email, phone, department, avatar_url
      `,
      [fullName, phone || null, photoUrl, req.user.id],
    );

    if (photoUrl && photoUrl !== profileRow.avatar_url) {
      await deleteLocalUploadFromUrl(profileRow.avatar_url);
    }

    res.json({
      profile: mapAdminProfile(rows[0]),
    });
  }),
);

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT
          ir.*,
          u.full_name AS created_by_name
        FROM integrity_reports ir
        LEFT JOIN users u ON u.id = ir.created_by_user_id
        ORDER BY ir.created_at DESC
      `,
    );

    res.json({
      reports: rows.map(mapIntegrityReport),
    });
  }),
);

router.post(
  '/reports',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['reportType', 'title', 'message', 'severity']);

    const allowedTypes = new Set(['case', 'candidate', 'application', 'system']);
    const allowedSeverities = new Set(['low', 'medium', 'high']);

    if (!allowedTypes.has(req.body.reportType)) {
      throw new HttpError(400, 'Invalid reportType value');
    }

    if (!allowedSeverities.has(req.body.severity)) {
      throw new HttpError(400, 'Invalid severity value');
    }

    const { rows } = await query(
      `
        INSERT INTO integrity_reports (
          id,
          report_type,
          reference_id,
          title,
          message,
          severity,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        randomUUID(),
        req.body.reportType,
        req.body.referenceId ?? null,
        req.body.title,
        req.body.message,
        req.body.severity,
        req.user.id,
      ],
    );

    res.status(201).json({
      report: mapIntegrityReport(rows[0]),
    });
  }),
);

router.get(
  '/reports/export.csv',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
        SELECT
          ir.id,
          ir.report_type,
          ir.reference_id,
          ir.title,
          ir.message,
          ir.severity,
          ir.status,
          ir.created_at,
          u.full_name AS created_by_name
        FROM integrity_reports ir
        LEFT JOIN users u ON u.id = ir.created_by_user_id
        ORDER BY ir.created_at DESC
      `,
    );

    const csv = toCsv([
      ['id', 'report_type', 'reference_id', 'title', 'message', 'severity', 'status', 'created_by', 'created_at'],
      ...rows.map((row) => [
        row.id,
        row.report_type,
        row.reference_id,
        row.title,
        row.message,
        row.severity,
        row.status,
        row.created_by_name,
        row.created_at.toISOString(),
      ]),
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-reports.csv"');
    res.send(csv);
  }),
);

router.get(
  '/export/dashboard.csv',
  asyncHandler(async (req, res) => {
    const [casesResult, applicationsResult] = await Promise.all([
      query(
        `
          SELECT external_ref, name, organization, risk_score, status
          FROM cases
          ORDER BY risk_score DESC, created_at DESC
        `,
      ),
      query(
        `
          SELECT candidate_code, candidate_name, review_status, score, conflict_detected
          FROM applications
          ORDER BY submitted_at DESC
        `,
      ),
    ]);

    const csv = toCsv([
      ['section', 'id', 'name', 'extra_1', 'extra_2', 'extra_3'],
      ...casesResult.rows.map((row) => [
        'case',
        row.external_ref,
        row.name,
        row.organization,
        row.risk_score,
        row.status,
      ]),
      ...applicationsResult.rows.map((row) => [
        'candidate',
        row.candidate_code,
        row.candidate_name,
        row.review_status,
        row.score,
        row.conflict_detected,
      ]),
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-dashboard.csv"');
    res.send(csv);
  }),
);

export default router;
