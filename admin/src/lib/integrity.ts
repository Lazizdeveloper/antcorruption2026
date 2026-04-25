import { AdminNotification, Candidate, IntegrityReport } from '../types';

export interface SelectionStatus {
  type: 'error' | 'success';
  message: string;
  candidate: Candidate;
}

export function formatOptionalValue(value?: string | null) {
  if (!value) {
    return "Ko'rsatilmagan";
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : "Ko'rsatilmagan";
}

export function isConflictHireReport(report: IntegrityReport) {
  return report.details?.kind === 'conflict_hire_alert';
}

export function formatHiringAlertReason(candidate: Candidate) {
  const reasonSummary = candidate.hiringAlert?.reasonSummary?.trim();

  if (reasonSummary) {
    return reasonSummary;
  }

  if (candidate.hiringAlert?.riskFlags?.auditConflict) {
    return 'Audit xulosasi qizil';
  }

  if (candidate.hiringAlert?.riskFlags?.lowAiScore) {
    return 'AI ball qizil';
  }

  if (candidate.conflictRisk === 'High') {
    return 'Audit xulosasi qizil';
  }

  return 'Qizil signal';
}

export function filterCandidates(candidates: Candidate[], searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const hrName = candidate.hiringAlert?.hr?.fullName?.toLowerCase() ?? '';

    return (
      candidate.id.toLowerCase().includes(normalizedQuery) ||
      candidate.candidateName.toLowerCase().includes(normalizedQuery) ||
      candidate.position.toLowerCase().includes(normalizedQuery) ||
      candidate.conflictDetails?.toLowerCase().includes(normalizedQuery) ||
      hrName.includes(normalizedQuery)
    );
  });
}

export function createLocalNotification(
  text: string,
  type: AdminNotification['type'],
): AdminNotification {
  return {
    id: `local:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    text,
    type,
    createdAt: new Date().toISOString(),
  };
}

export function formatNotificationTime(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdTime);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Hozir';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} daqiqa oldin`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} soat oldin`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} kun oldin`;
}

export function mergeNotifications(
  serverNotifications: AdminNotification[],
  localNotifications: AdminNotification[],
  dismissedServerNotificationIds: string[],
) {
  const dismissedIds = new Set(dismissedServerNotificationIds);

  return [...localNotifications, ...serverNotifications.filter((notification) => !dismissedIds.has(notification.id))]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

export function buildSelectionStatus(candidate: Candidate): SelectionStatus {
  if (candidate.hiringAlert) {
    const hrName = candidate.hiringAlert.hr?.fullName ?? 'HR xodim';
    const riskReason = formatHiringAlertReason(candidate).toLowerCase();

    return {
      type: 'error',
      candidate,
      message: `${candidate.hiringAlert.organization}dagi ${hrName} ${riskReason} bo'lgan ${candidate.candidateName}ni ishga qabul qilgan.`,
    };
  }

  if (candidate.conflictRisk === 'High' && candidate.score < 50) {
    return {
      type: 'error',
      candidate,
      message: `BLOKIROVKA: Menejer #${candidate.id.split('-')[1]} nomzodni tanlashga urindi (Ball: ${candidate.score}). "Majburiy reyting" qoidasi buzilganligi sababli tizim bloklandi.`,
    };
  }

  return {
    type: 'success',
    candidate,
    message: `TASDIQLANDI: #${candidate.id.split('-')[1]} nomzod barcha tekshiruvlardan muvaffaqiyatli o'tdi va zaxiraga olindi.`,
  };
}

export function buildSelectionNotification(candidate: Candidate) {
  if (candidate.hiringAlert) {
    const reasonSummary = formatHiringAlertReason(candidate);

    return {
      text: `${candidate.department}: ${reasonSummary} bo'lgan nomzod ishga qabul qilindi`,
      type: 'error' as const,
    };
  }

  if (candidate.conflictRisk === 'High' && candidate.score < 50) {
    return {
      text: `Blokirovka: Nomzod #${candidate.id.split('-')[1]} bo'yicha shubhali urinish`,
      type: 'error' as const,
    };
  }

  return null;
}
