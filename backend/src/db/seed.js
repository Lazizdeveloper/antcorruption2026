import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import {
  seedAnomalies,
  seedApplications,
  seedCandidateProfiles,
  seedCases,
  seedExternalProjects,
  seedIntegrityReports,
  seedMeritQuestions,
  seedNewsItems,
  seedRegionalTaxStats,
  seedUsers,
  seedVacancies,
} from '../data/seedData.js';
import { pool } from './pool.js';
import { normalizeEmail } from '../utils/formatters.js';

export async function runSeed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userIdsByEmail = new Map();
    const profileIdsByEmail = new Map();
    const applicationIdsByCode = new Map();

    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, env.bcryptRounds);
      const { rows } = await client.query(
        `
          INSERT INTO users (
            id,
            full_name,
            email,
            password_hash,
            role,
            department,
            phone
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email)
          DO UPDATE SET
            full_name = EXCLUDED.full_name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            phone = EXCLUDED.phone,
            updated_at = NOW()
          RETURNING id, email
        `,
        [
          randomUUID(),
          user.fullName,
          normalizeEmail(user.email),
          passwordHash,
          user.role,
          user.department,
          user.phone,
        ],
      );

      userIdsByEmail.set(normalizeEmail(rows[0].email), rows[0].id);
    }

    for (const profile of seedCandidateProfiles) {
      const email = normalizeEmail(profile.email);
      const userId = userIdsByEmail.get(email);

      if (!userId) {
        continue;
      }

      const { rows } = await client.query(
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
          ON CONFLICT (user_id)
          DO UPDATE SET
            candidate_code = EXCLUDED.candidate_code,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            gender = EXCLUDED.gender,
            birth_place = EXCLUDED.birth_place,
            photo_url = EXCLUDED.photo_url,
            phone = EXCLUDED.phone,
            connections = EXCLUDED.connections,
            updated_at = NOW()
          RETURNING id, user_id
        `,
        [
          randomUUID(),
          userId,
          profile.candidateCode,
          profile.firstName,
          profile.lastName,
          profile.gender,
          profile.birthPlace,
          profile.photoUrl,
          profile.phone,
          JSON.stringify(profile.connections),
        ],
      );

      profileIdsByEmail.set(email, rows[0].id);
    }

    for (const vacancy of seedVacancies) {
      await client.query(
        `
          INSERT INTO vacancies (id, department, position)
          VALUES ($1, $2, $3)
          ON CONFLICT (department, position)
          DO NOTHING
        `,
        [randomUUID(), vacancy.department, vacancy.position],
      );
    }

    for (const question of seedMeritQuestions) {
      await client.query(
        `
          INSERT INTO merit_questions (id, question, options, correct_answer)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (question)
          DO UPDATE SET
            options = EXCLUDED.options,
            correct_answer = EXCLUDED.correct_answer
        `,
        [randomUUID(), question.question, JSON.stringify(question.options), question.correctAnswer],
      );
    }

    for (const application of seedApplications) {
      const normalizedEmail = normalizeEmail(application.candidateEmailRef ?? application.candidateEmail);
      const candidateUserId = userIdsByEmail.get(normalizedEmail) ?? null;
      const candidateProfileId = profileIdsByEmail.get(normalizedEmail) ?? null;

      const { rows } = await client.query(
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
            interview_time,
            submitted_at,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27
          )
          ON CONFLICT (candidate_code, position, submitted_at)
          DO UPDATE SET
            candidate_user_id = EXCLUDED.candidate_user_id,
            candidate_profile_id = EXCLUDED.candidate_profile_id,
            candidate_name = EXCLUDED.candidate_name,
            candidate_email = EXCLUDED.candidate_email,
            department = EXCLUDED.department,
            candidate_stage = EXCLUDED.candidate_stage,
            review_status = EXCLUDED.review_status,
            score = EXCLUDED.score,
            merit_score = EXCLUDED.merit_score,
            blind_mode = EXCLUDED.blind_mode,
            conflict_detected = EXCLUDED.conflict_detected,
            conflict_details = EXCLUDED.conflict_details,
            recruiter_info = EXCLUDED.recruiter_info,
            phone = EXCLUDED.phone,
            telegram = EXCLUDED.telegram,
            masked_data = EXCLUDED.masked_data,
            documents = EXCLUDED.documents,
            processing_time_ms = EXCLUDED.processing_time_ms,
            match_percentage = EXCLUDED.match_percentage,
            proctoring_risk = EXCLUDED.proctoring_risk,
            interview_time = EXCLUDED.interview_time,
            updated_at = EXCLUDED.updated_at
          RETURNING id, candidate_code
        `,
        [
          randomUUID(),
          candidateUserId,
          candidateProfileId,
          application.candidateCode,
          application.candidateName,
          normalizeEmail(application.candidateEmail),
          application.position,
          application.department,
          application.candidateStage,
          application.reviewStatus,
          application.score,
          application.meritScore,
          application.blindMode,
          application.conflictDetected,
          application.conflictDetails,
          application.recruiterInfo,
          application.phone,
          application.telegram,
          JSON.stringify(application.maskedData),
          JSON.stringify(application.documents),
          application.processingTimeMs,
          application.matchPercentage,
          application.proctoringRisk,
          application.interviewTime,
          application.submittedAt,
          application.createdAt,
          application.updatedAt,
        ],
      );

      applicationIdsByCode.set(rows[0].candidate_code, rows[0].id);
    }

    for (const anomaly of seedAnomalies) {
      const applicationId = applicationIdsByCode.get(anomaly.candidateCode);

      if (!applicationId) {
        continue;
      }

      await client.query(
        `
          INSERT INTO anomalies (id, application_id, type, message, severity, source, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (application_id, type, message)
          DO UPDATE SET
            severity = EXCLUDED.severity,
            source = EXCLUDED.source,
            created_at = EXCLUDED.created_at
        `,
        [
          randomUUID(),
          applicationId,
          anomaly.type,
          anomaly.message,
          anomaly.severity,
          anomaly.source,
          anomaly.createdAt,
        ],
      );
    }

    for (const item of seedCases) {
      await client.query(
        `
          INSERT INTO cases (
            id,
            external_ref,
            name,
            organization,
            case_type,
            risk_score,
            description,
            anomaly_notes,
            source_platform,
            estimated_savings,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (external_ref)
          DO UPDATE SET
            name = EXCLUDED.name,
            organization = EXCLUDED.organization,
            case_type = EXCLUDED.case_type,
            risk_score = EXCLUDED.risk_score,
            description = EXCLUDED.description,
            anomaly_notes = EXCLUDED.anomaly_notes,
            source_platform = EXCLUDED.source_platform,
            estimated_savings = EXCLUDED.estimated_savings,
            status = EXCLUDED.status,
            updated_at = NOW()
        `,
        [
          randomUUID(),
          item.externalRef,
          item.name,
          item.organization,
          item.caseType,
          item.riskScore,
          item.description,
          JSON.stringify(item.anomalyNotes),
          item.sourcePlatform,
          item.estimatedSavings,
          item.status,
        ],
      );
    }

    for (const item of seedExternalProjects) {
      await client.query(
        `
          INSERT INTO external_projects (id, title, url, published_date, document_type, source)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (url)
          DO UPDATE SET
            title = EXCLUDED.title,
            published_date = EXCLUDED.published_date,
            document_type = EXCLUDED.document_type,
            source = EXCLUDED.source
        `,
        [randomUUID(), item.title, item.url, item.publishedDate, item.documentType, item.source],
      );
    }

    for (const item of seedNewsItems) {
      await client.query(
        `
          INSERT INTO news_items (id, title, url, published_date, summary, image_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (url)
          DO UPDATE SET
            title = EXCLUDED.title,
            published_date = EXCLUDED.published_date,
            summary = EXCLUDED.summary,
            image_url = EXCLUDED.image_url
        `,
        [randomUUID(), item.title, item.url, item.publishedDate, item.summary, item.imageUrl],
      );
    }

    for (const item of seedRegionalTaxStats) {
      await client.query(
        `
          INSERT INTO regional_tax_stats (id, region_name, entities, individuals)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (region_name)
          DO UPDATE SET
            entities = EXCLUDED.entities,
            individuals = EXCLUDED.individuals
        `,
        [randomUUID(), item.regionName, item.entities, item.individuals],
      );
    }

    for (const report of seedIntegrityReports) {
      const createdByUserId = report.createdByEmail
        ? userIdsByEmail.get(normalizeEmail(report.createdByEmail)) ?? null
        : null;

      const existingReport = await client.query(
        `
          SELECT id
          FROM integrity_reports
          WHERE report_type = $1
            AND COALESCE(reference_id, '') = COALESCE($2, '')
            AND title = $3
          LIMIT 1
        `,
        [report.reportType, report.referenceId ?? null, report.title],
      );

      if (existingReport.rows.length > 0) {
        await client.query(
          `
            UPDATE integrity_reports
            SET
              message = $1,
              severity = $2,
              status = $3,
              created_by_user_id = $4,
              created_at = $5,
              updated_at = $6
            WHERE id = $7
          `,
          [
            report.message,
            report.severity,
            report.status,
            createdByUserId,
            report.createdAt,
            report.updatedAt,
            existingReport.rows[0].id,
          ],
        );
        continue;
      }

      await client.query(
        `
          INSERT INTO integrity_reports (
            id,
            report_type,
            reference_id,
            title,
            message,
            severity,
            status,
            created_by_user_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          report.reportType,
          report.referenceId ?? null,
          report.title,
          report.message,
          report.severity,
          report.status,
          createdByUserId,
          report.createdAt,
          report.updatedAt,
        ],
      );
    }

    await client.query('COMMIT');
    console.log('Database seed completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
