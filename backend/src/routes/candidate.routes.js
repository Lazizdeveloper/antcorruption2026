import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  mapCandidateApplication,
  mapCandidateProfile,
} from '../db/mappers.js';
import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { groupVacancies } from '../utils/formatters.js';
import { HttpError } from '../utils/httpError.js';
import { deleteLocalUploadFromUrl } from '../utils/uploads.js';
import {
  ensureFields,
  isValidPhoneNumber,
  isValidTelegramUsername,
} from '../utils/validation.js';

const router = express.Router();

router.use(authenticate, requireRoles('candidate'));

const REQUIRED_DOCUMENT_TYPES = ['diploma', 'passport', 'certificate', 'employment'];

function normalizeDocuments(documents) {
  return documents.map((document) => ({
    name: String(document?.name ?? '').trim(),
    type: String(document?.type ?? '').trim(),
    url: String(document?.url ?? '').trim(),
    mimeType: document?.mimeType ? String(document.mimeType).trim() : undefined,
    sizeKb:
      document?.sizeKb === undefined || document?.sizeKb === null
        ? undefined
        : Number(document.sizeKb),
  }));
}

function validateDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new HttpError(400, "Majburiy hujjatlarni yuklang: diplom, pasport, sertifikat va ish staji PDF.");
  }

  const normalizedDocuments = normalizeDocuments(documents);
  const missingDocumentTypes = REQUIRED_DOCUMENT_TYPES.filter(
    (documentType) => !normalizedDocuments.some((document) => document.type === documentType),
  );

  if (missingDocumentTypes.length > 0) {
    throw new HttpError(400, "Majburiy hujjatlarni yuklang: diplom, pasport, sertifikat va ish staji PDF.");
  }

  const hasInvalidDocument = normalizedDocuments.some((document) => {
    const looksLikePdf = document.name.toLowerCase().endsWith('.pdf');
    const mimeType = document.mimeType?.toLowerCase();

    return !document.name || !document.type || !document.url || (!looksLikePdf && mimeType !== 'application/pdf');
  });

  if (hasInvalidDocument) {
    throw new HttpError(400, "Har bir hujjat uchun to'g'ri PDF fayl tanlang.");
  }

  return normalizedDocuments;
}

async function validateVacancySelection(department, position) {
  const { rows } = await query(
    `
      SELECT 1
      FROM vacancies
      WHERE department = $1 AND position = $2 AND is_active = TRUE
      LIMIT 1
    `,
    [department, position],
  );

  if (rows.length === 0) {
    throw new HttpError(400, "Tanlangan vazirlik va vakansiya mos kelmadi yoki faol emas.");
  }
}

async function getProfileAndUser(userId) {
  const { rows } = await query(
    `
      SELECT
        cp.*,
        u.email,
        u.phone AS user_phone,
        u.avatar_url AS user_avatar_url
      FROM candidate_profiles cp
      INNER JOIN users u ON u.id = cp.user_id
      WHERE cp.user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'Candidate profile not found');
  }

  return rows[0];
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const profileRow = await getProfileAndUser(req.user.id);

    const [applicationResult, vacancyResult, questionResult] = await Promise.all([
      query(
        `
          SELECT *
          FROM applications
          WHERE candidate_user_id = $1
          ORDER BY submitted_at DESC
          LIMIT 1
        `,
        [req.user.id],
      ),
      query(
        `
          SELECT department, position
          FROM vacancies
          WHERE is_active = TRUE
          ORDER BY department, position
        `,
      ),
      query(
        `
          SELECT id, question, options
          FROM merit_questions
          ORDER BY created_at ASC
        `,
      ),
    ]);

    const latestApplication = applicationResult.rows[0]
      ? mapCandidateApplication(applicationResult.rows[0])
      : null;
    let rankingPreview = [];

    if (latestApplication) {
      const rankingResult = await query(
        `
          SELECT candidate_code, merit_score, score, conflict_detected
          FROM applications
          WHERE department = $1
          ORDER BY merit_score DESC, score DESC, submitted_at ASC
          LIMIT 10
        `,
        [latestApplication.department],
      );

      rankingPreview = rankingResult.rows.map((row, index) => ({
        rank: index + 1,
        name:
          row.candidate_code === latestApplication.candidateCode
            ? 'Siz (Anonim)'
            : `Anonim Nomzod #${index + 1}`,
        score: row.merit_score,
        isYou: row.candidate_code === latestApplication.candidateCode,
        blocked: row.conflict_detected && Number(row.merit_score) < 50,
      }));
    }

    res.json({
      candidate: mapCandidateProfile(
        profileRow,
        {
          email: profileRow.email,
          phone: profileRow.user_phone,
          avatarUrl: profileRow.user_avatar_url,
        },
      ),
      application: latestApplication,
      vacancies: groupVacancies(vacancyResult.rows),
      meritQuestions: questionResult.rows.map((row, index) => ({
        id: index + 1,
        question: row.question,
        options: row.options,
      })),
      rankingPreview,
    });
  }),
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    let previousPhotoUrl = '';

    try {
      await client.query('BEGIN');

      const profile = await getProfileAndUser(req.user.id);
      const fullName = `${req.body.name ?? profile.first_name} ${req.body.surname ?? profile.last_name}`.trim();
      const nextPhotoUrl = req.body.photoUrl ?? profile.photo_url ?? profile.user_avatar_url ?? null;
      const nextPhone = req.body.phone !== undefined
        ? String(req.body.phone).trim()
        : (profile.phone ?? req.user.phone);
      previousPhotoUrl = profile.photo_url ?? profile.user_avatar_url ?? '';

      if (!isValidPhoneNumber(nextPhone)) {
        throw new HttpError(400, "Telefon raqamini to'g'ri kiriting. Masalan: +998901234567.");
      }

      await client.query(
        `
          UPDATE users
          SET full_name = $1, phone = $2, avatar_url = $3, updated_at = NOW()
          WHERE id = $4
        `,
        [
          fullName,
          nextPhone,
          nextPhotoUrl,
          req.user.id,
        ],
      );

      const { rows } = await client.query(
        `
          UPDATE candidate_profiles
          SET
            first_name = $1,
            last_name = $2,
            gender = $3,
            birth_place = $4,
            photo_url = $5,
            phone = $6,
            connections = $7,
            updated_at = NOW()
          WHERE user_id = $8
          RETURNING *
        `,
        [
          req.body.name ?? profile.first_name,
          req.body.surname ?? profile.last_name,
          profile.gender,
          req.body.birthPlace ?? profile.birth_place,
          nextPhotoUrl,
          nextPhone,
          JSON.stringify(Array.isArray(req.body.connections) ? req.body.connections : profile.connections),
          req.user.id,
        ],
      );

      await client.query('COMMIT');

      if (nextPhotoUrl && nextPhotoUrl !== previousPhotoUrl) {
        await deleteLocalUploadFromUrl(previousPhotoUrl);
      }

      res.json({
        candidate: mapCandidateProfile(rows[0], {
          email: req.user.email,
          phone: nextPhone,
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
        WHERE candidate_user_id = $1
        ORDER BY submitted_at DESC
      `,
      [req.user.id],
    );

    res.json({
      applications: rows.map(mapCandidateApplication),
    });
  }),
);

router.post(
  '/applications',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['position', 'department', 'phone', 'telegram']);

    const department = String(req.body.department).trim();
    const position = String(req.body.position).trim();
    const phone = String(req.body.phone).trim();
    const telegram = String(req.body.telegram).trim();

    if (!isValidPhoneNumber(phone)) {
      throw new HttpError(400, "Telefon raqamini to'g'ri kiriting. Masalan: +998901234567.");
    }

    if (!isValidTelegramUsername(req.body.telegram)) {
      throw new HttpError(400, "Telegram username'ni to'g'ri kiriting. Masalan: @username.");
    }

    await validateVacancySelection(department, position);

    const profileRow = await getProfileAndUser(req.user.id);
    const maskedData = req.body.maskedData ?? {
      skills: Array.isArray(req.body.skills) ? req.body.skills : [],
      experience: req.body.experience ?? '',
      education: req.body.education ?? '',
      summary: req.body.summary ?? '',
    };
    const documents = validateDocuments(req.body.documents);
    const connections = Array.isArray(profileRow.connections) ? profileRow.connections : [];
    const conflictDetected = connections.length > 0;
    const matchPercentage = Math.min(
      98,
      55 +
        (Array.isArray(maskedData.skills) ? maskedData.skills.length * 8 : 0) +
        (maskedData.summary ? 8 : 0) +
        documents.length * 6,
    );

    const { rows } = await query(
      `
        INSERT INTO applications (
          id,
          candidate_user_id,
          candidate_profile_id,
          candidate_code,
          candidate_name,
          candidate_email,
          position,
          department,
          candidate_stage,
          review_status,
          score,
          merit_score,
          blind_mode,
          conflict_detected,
          conflict_details,
          recruiter_info,
          phone,
          telegram,
          masked_data,
          documents,
          processing_time_ms,
          match_percentage,
          proctoring_risk,
          interview_time
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'blind_review', 'pending',
          0, 0, TRUE, $9, $10, NULL, $11, $12, $13, $14, 0, $15, 0, 'Kutilmoqda'
        )
        RETURNING *
      `,
      [
        randomUUID(),
        req.user.id,
        profileRow.id,
        profileRow.candidate_code,
        `${profileRow.first_name} ${profileRow.last_name}`.trim(),
        req.user.email,
        position,
        department,
        conflictDetected,
        conflictDetected ? String(connections[0]) : null,
        phone,
        telegram,
        JSON.stringify(maskedData),
        JSON.stringify(documents),
        matchPercentage,
      ],
    );

    res.status(201).json({
      application: mapCandidateApplication(rows[0]),
    });
  }),
);

router.post(
  '/applications/:id/merit-test/submit',
  asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body.answers)) {
      throw new HttpError(400, 'answers must be an array');
    }

    const applicationResult = await query(
      `
        SELECT *
        FROM applications
        WHERE id = $1 AND candidate_user_id = $2
        LIMIT 1
      `,
      [req.params.id, req.user.id],
    );

    if (applicationResult.rows.length === 0) {
      throw new HttpError(404, 'Application not found');
    }

    const questionsResult = await query(
      `
        SELECT question, correct_answer
        FROM merit_questions
        ORDER BY created_at ASC
      `,
    );

    const questions = questionsResult.rows;
    const correctAnswers = questions.reduce((sum, question, index) => {
      return sum + (req.body.answers[index] === question.correct_answer ? 1 : 0);
    }, 0);
    const meritScore = questions.length === 0 ? 0 : Math.round((correctAnswers / questions.length) * 100);

    const { rows } = await query(
      `
        UPDATE applications
        SET
          candidate_stage = 'ranking',
          review_status = 'reviewing',
          merit_score = $1,
          score = $1,
          processing_time_ms = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [meritScore, 1200 + correctAnswers * 400, req.params.id],
    );

    res.json({
      score: meritScore,
      application: mapCandidateApplication(rows[0]),
    });
  }),
);

export default router;
