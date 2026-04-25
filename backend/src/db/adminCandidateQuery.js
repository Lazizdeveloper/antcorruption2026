import { CONFLICT_HIRE_ALERT_KIND } from '../utils/conflictHire.js';

const candidateAlertSelect = `
  SELECT
    a.*,
    alert.id AS alert_report_id,
    alert.title AS alert_report_title,
    alert.message AS alert_report_message,
    alert.created_at AS alert_report_created_at,
    alert.details AS alert_report_details
  FROM applications a
  LEFT JOIN LATERAL (
    SELECT
      ir.id,
      ir.title,
      ir.message,
      ir.created_at,
      ir.details
    FROM integrity_reports ir
    WHERE ir.reference_id = a.id::text
      AND ir.report_type = 'application'
      AND COALESCE(ir.details ->> 'kind', '') = $1
    ORDER BY ir.created_at DESC
    LIMIT 1
  ) alert ON TRUE
`;

export function buildAdminCandidateQuery(limit) {
  return {
    text: `
      ${candidateAlertSelect}
      ORDER BY (alert.id IS NOT NULL) DESC, a.conflict_detected DESC, a.score DESC, a.submitted_at DESC
      LIMIT $2
    `,
    values: [CONFLICT_HIRE_ALERT_KIND, limit],
  };
}
