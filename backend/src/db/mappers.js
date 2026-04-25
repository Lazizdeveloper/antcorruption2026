export function mapCaseRow(row) {
  return {
    id: row.external_ref,
    name: row.name,
    organization: row.organization,
    type: row.case_type,
    riskScore: row.risk_score,
    description: row.description,
    anomalies: row.anomaly_notes ?? [],
    sourcePlatform: row.source_platform,
    estimatedSavings: Number(row.estimated_savings ?? 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApplicationRow(row) {
  return {
    id: row.id,
    candidateCode: row.candidate_code,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    position: row.position,
    department: row.department,
    status: row.review_status,
    candidateStage: row.candidate_stage,
    score: row.score,
    meritScore: row.merit_score,
    blindMode: row.blind_mode,
    conflictDetected: row.conflict_detected,
    conflictDetails: row.conflict_details,
    recruiterInfo: row.recruiter_info,
    phone: row.phone,
    telegram: row.telegram,
    maskedData: row.masked_data ?? {},
    documents: row.documents ?? [],
    processingTimeMs: row.processing_time_ms,
    matchPercentage: row.match_percentage,
    proctoringRisk: row.proctoring_risk,
    interviewTime: row.interview_time,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHrApplicationRow(row) {
  const application = mapApplicationRow(row);

  return {
    ...application,
    documents: Array.isArray(application.documents)
      ? application.documents.filter((document) => document?.type !== 'passport')
      : [],
  };
}

export function mapCandidateCard(row) {
  const alertDetails = row.alert_report_details ?? {};
  const alertCandidate = alertDetails.candidate ?? {};
  const alertHr = alertDetails.hr ?? null;

  return {
    id: row.candidate_code,
    candidateName: row.candidate_name,
    position: row.position,
    status: row.review_status,
    score: row.score,
    conflictRisk: row.conflict_detected ? 'High' : 'Low',
    conflictDetails: row.conflict_details,
    department: row.department,
    matchPercentage: row.match_percentage,
    interviewTime: row.interview_time,
    proctoringRisk: row.proctoring_risk,
    hiringAlert: row.alert_report_id
      ? {
          id: row.alert_report_id,
          title: row.alert_report_title,
          message: row.alert_report_message,
          createdAt: row.alert_report_created_at,
          organization: alertDetails.organization ?? row.department,
          reasonSummary: alertDetails.reasonSummary ?? null,
          riskFlags: alertDetails.riskFlags ?? null,
          aiScore:
            alertDetails.aiScore === undefined || alertDetails.aiScore === null
              ? row.score
              : Number(alertDetails.aiScore),
          auditStatus: alertDetails.auditStatus ?? (row.conflict_detected ? 'CONFLICT' : 'CLEAN'),
          hr: alertHr
            ? {
                fullName: alertHr.fullName ?? null,
                firstName: alertHr.firstName ?? null,
                lastName: alertHr.lastName ?? null,
                middleName: alertHr.middleName ?? null,
                email: alertHr.email ?? null,
                phone: alertHr.phone ?? null,
              }
            : null,
          candidate: {
            fullName: alertCandidate.fullName ?? row.candidate_name,
            code: alertCandidate.code ?? row.candidate_code,
            email: alertCandidate.email ?? row.candidate_email,
            phone: alertCandidate.phone ?? row.phone ?? null,
            telegram: alertCandidate.telegram ?? row.telegram ?? null,
            position: alertCandidate.position ?? row.position,
            department: alertCandidate.department ?? row.department,
            conflictDetails: alertCandidate.conflictDetails ?? row.conflict_details,
          },
        }
      : null,
  };
}

export function mapAnomalyRow(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    message: row.message,
    severity: row.severity,
    source: row.source,
    timestamp: row.created_at,
  };
}

export function mapCandidateProfile(row, user) {
  return {
    id: row.candidate_code,
    name: row.first_name,
    surname: row.last_name,
    gender: row.gender,
    birthPlace: row.birth_place,
    photoUrl: row.photo_url ?? user.avatarUrl ?? '',
    email: user.email,
    phone: row.phone || user.phone,
    connections: row.connections ?? [],
  };
}

export function mapHrProfile(row, user) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: user.email,
    phone: user.phone,
    photoUrl: user.avatarUrl ?? '',
    passportNumber: row.passport_number,
    passportPinfl: row.passport_pinfl,
  };
}

export function mapAdminProfile(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    department: row.department ?? '',
    photoUrl: row.avatar_url ?? '',
  };
}

export function mapCandidateApplication(row) {
  return {
    id: row.id,
    candidateId: row.candidate_code,
    candidateCode: row.candidate_code,
    position: row.position,
    department: row.department,
    status: row.candidate_stage,
    reviewStatus: row.review_status,
    score: row.score,
    documents: row.documents ?? [],
    meritScore: row.merit_score,
    blindMode: row.blind_mode,
    conflictDetected: row.conflict_detected,
    conflictDetails: row.conflict_details,
    phone: row.phone,
    telegram: row.telegram,
    maskedData: row.masked_data ?? {},
    matchPercentage: row.match_percentage,
    interviewTime: row.interview_time,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export function mapExternalProjectRow(row) {
  return {
    title: row.title,
    url: row.url,
    published_date: row.published_date,
    document_type: row.document_type,
    source: row.source,
  };
}

export function mapNewsRow(row) {
  return {
    title: row.title,
    url: row.url,
    published_date: row.published_date,
    summary: row.summary,
    image_url: row.image_url,
  };
}

export function mapIntegrityReport(row) {
  const details = row.details ?? {};
  const hr = details.hr ?? null;

  return {
    id: row.id,
    reportType: row.report_type,
    referenceId: row.reference_id,
    title: row.title,
    message: row.message,
    severity: row.severity,
    status: row.status,
    createdBy: row.created_by_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    details: {
      ...details,
      hr: hr
        ? {
            fullName: hr.fullName ?? null,
            firstName: hr.firstName ?? null,
            lastName: hr.lastName ?? null,
            middleName: hr.middleName ?? null,
            email: hr.email ?? null,
            phone: hr.phone ?? null,
          }
        : null,
    },
  };
}
