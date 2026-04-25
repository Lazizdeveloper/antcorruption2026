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

export function mapCandidateCard(row) {
  return {
    id: row.candidate_code,
    score: row.score,
    conflictRisk: row.conflict_detected ? 'High' : 'Low',
    conflictDetails: row.conflict_details,
    department: row.department,
    matchPercentage: row.match_percentage,
    interviewTime: row.interview_time,
    proctoringRisk: row.proctoring_risk,
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
    photoUrl: row.photo_url,
    email: user.email,
    phone: row.phone || user.phone,
    connections: row.connections ?? [],
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
