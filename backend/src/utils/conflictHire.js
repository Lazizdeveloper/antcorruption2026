import { randomUUID } from 'node:crypto';

// Legacy `kind` value is kept so existing reports continue to resolve in admin queries.
export const CONFLICT_HIRE_ALERT_KIND = 'conflict_hire_alert';
export const RISKY_HIRE_SCORE_THRESHOLD = 60;

export function getRiskyHireSignals(application) {
  const score = Number(application.score ?? 0);
  const auditConflict = Boolean(application.conflict_detected);
  const lowAiScore = score <= RISKY_HIRE_SCORE_THRESHOLD;

  let reasonSummary = '';

  if (lowAiScore && auditConflict) {
    reasonSummary = "AI ball qizil va audit xulosasi qizil";
  } else if (lowAiScore) {
    reasonSummary = 'AI ball qizil';
  } else if (auditConflict) {
    reasonSummary = 'Audit xulosasi qizil';
  }

  return {
    lowAiScore,
    auditConflict,
    hasRisk: lowAiScore || auditConflict,
    score,
    auditStatus: auditConflict ? 'CONFLICT' : 'CLEAN',
    reasonSummary,
  };
}

export function shouldCreateRiskyHireAlert(application) {
  return getRiskyHireSignals(application).hasRisk;
}

export function buildConflictHireAnomalyMessage(application) {
  const candidateName = application.candidate_name;
  const signals = getRiskyHireSignals(application);

  if (!signals.hasRisk) {
    return `${candidateName} hired holatiga o'tkazildi.`;
  }

  return `${candidateName} ${signals.reasonSummary.toLowerCase()} bo'lishiga qaramay hired holatiga o'tkazildi.`;
}

export function buildConflictHireReport(application, hrContext) {
  const signals = getRiskyHireSignals(application);
  const hrFullName =
    hrContext.full_name ??
    [hrContext.first_name, hrContext.last_name].filter(Boolean).join(' ') ??
    'HR xodimi';
  const hrPhone = hrContext.phone ?? "ko'rsatilmagan";
  const hrEmail = hrContext.email ?? "ko'rsatilmagan";
  const candidatePhone = application.phone ?? "ko'rsatilmagan";
  const candidateTelegram = application.telegram ?? "ko'rsatilmagan";

  return {
    title: `Riskli qabul: ${application.candidate_code}`,
    message: [
      `${application.department}da qizil signalga ega nomzod ishga qabul qilindi.`,
      `Sabab: ${signals.reasonSummary || "Qo'lda tekshiruv talab qilinadi"}.`,
      `HR: ${hrFullName}`,
      `HR aloqa: ${hrEmail}, ${hrPhone}`,
      `Nomzod: ${application.candidate_name} (${application.candidate_code})`,
      `Lavozim: ${application.position}`,
      `Nomzod aloqa: ${candidatePhone}, ${candidateTelegram}`,
      `AI ball: ${signals.score}/100`,
      `Audit holati: ${signals.auditStatus}`,
      `Audit tafsiloti: ${application.conflict_details ?? "Aniq qarindoshlik qaydi yo'q."}`,
    ].join('\n'),
    details: {
      kind: CONFLICT_HIRE_ALERT_KIND,
      organization: application.department,
      reasonSummary: signals.reasonSummary,
      riskFlags: {
        lowAiScore: signals.lowAiScore,
        auditConflict: signals.auditConflict,
      },
      aiScore: signals.score,
      auditStatus: signals.auditStatus,
      hr: {
        fullName: hrFullName,
        firstName: hrContext.first_name ?? null,
        lastName: hrContext.last_name ?? null,
        middleName: hrContext.middle_name ?? null,
        email: hrContext.email ?? null,
        phone: hrContext.phone ?? null,
      },
      candidate: {
        fullName: application.candidate_name,
        code: application.candidate_code,
        email: application.candidate_email,
        phone: application.phone ?? null,
        telegram: application.telegram ?? null,
        position: application.position,
        department: application.department,
        score: signals.score,
        meritScore: Number(application.merit_score),
        conflictDetails: application.conflict_details ?? null,
      },
    },
  };
}

export async function upsertConflictHireReport({
  client,
  applicationId,
  application,
  hrContext,
  createdByUserId,
}) {
  const conflictReport = buildConflictHireReport(application, hrContext);
  const existingReportResult = await client.query(
    `
      SELECT id
      FROM integrity_reports
      WHERE report_type = 'application'
        AND reference_id = $1
        AND COALESCE(details ->> 'kind', '') = $2
      LIMIT 1
    `,
    [applicationId, CONFLICT_HIRE_ALERT_KIND],
  );

  if (existingReportResult.rows.length > 0) {
    await client.query(
      `
        UPDATE integrity_reports
        SET
          title = $1,
          message = $2,
          severity = 'high',
          status = 'open',
          created_by_user_id = $3,
          details = $4,
          updated_at = NOW()
        WHERE id = $5
      `,
      [
        conflictReport.title,
        conflictReport.message,
        createdByUserId,
        JSON.stringify(conflictReport.details),
        existingReportResult.rows[0].id,
      ],
    );

    return conflictReport;
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
        details
      )
      VALUES ($1, 'application', $2, $3, $4, 'high', 'open', $5, $6)
    `,
    [
      randomUUID(),
      applicationId,
      conflictReport.title,
      conflictReport.message,
      createdByUserId,
      JSON.stringify(conflictReport.details),
    ],
  );

  return conflictReport;
}
