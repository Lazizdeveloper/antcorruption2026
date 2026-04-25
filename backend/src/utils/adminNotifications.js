import { CONFLICT_HIRE_ALERT_KIND } from './conflictHire.js';

const DEFAULT_NOTIFICATION_LIMIT = 8;

function mapSeverityToType(severity) {
  if (severity === 'high') {
    return 'error';
  }

  if (severity === 'medium') {
    return 'info';
  }

  return 'success';
}

function mapReportNotification(report) {
  const isConflictHireAlert = report.details?.kind === CONFLICT_HIRE_ALERT_KIND;
  const organization = report.details?.organization ?? 'Tashkilot';
  const reasonSummary = report.details?.reasonSummary;

  return {
    id: `report:${report.id}`,
    text: isConflictHireAlert
      ? reasonSummary
        ? `${organization}: ${reasonSummary} bo'lgan nomzod ishga qabul qilindi`
        : `${organization}: riskli ishga qabul holati qayd etildi`
      : report.title,
    type: mapSeverityToType(report.severity),
    createdAt: report.created_at,
  };
}

function mapCaseNotification(caseItem) {
  return {
    id: `case:${caseItem.external_ref}`,
    text: `Yangi yuqori xavfli holat aniqlandi: ${caseItem.external_ref}`,
    type: 'error',
    createdAt: caseItem.created_at,
  };
}

function mapAnomalyNotification(anomaly) {
  return {
    id: `anomaly:${anomaly.id}`,
    text: anomaly.message,
    type: mapSeverityToType(anomaly.severity),
    createdAt: anomaly.created_at,
  };
}

export function buildAdminNotifications(
  {
    reports = [],
    cases = [],
    anomalies = [],
  },
  limit = DEFAULT_NOTIFICATION_LIMIT,
) {
  return [
    ...reports.map(mapReportNotification),
    ...cases.map(mapCaseNotification),
    ...anomalies.map(mapAnomalyNotification),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}
