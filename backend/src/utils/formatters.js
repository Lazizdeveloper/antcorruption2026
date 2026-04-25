const monthNames = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

export function formatPotentialSavings(amount) {
  const numericAmount = Number(amount ?? 0);

  if (numericAmount >= 1_000_000) {
    return `${(numericAmount / 1_000_000).toFixed(1)}M $`;
  }

  if (numericAmount >= 1_000) {
    return `${(numericAmount / 1_000).toFixed(1)}K $`;
  }

  return `${numericAmount.toFixed(0)} $`;
}

export function formatMonthLabel(dateValue) {
  const date = new Date(dateValue);
  return monthNames[date.getUTCMonth()] ?? monthNames[date.getMonth()];
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function splitFullName(fullName) {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || parts[0],
  };
}

export function groupVacancies(rows) {
  const buckets = new Map();

  for (const row of rows) {
    if (!buckets.has(row.department)) {
      buckets.set(row.department, []);
    }

    buckets.get(row.department).push(row.position);
  }

  return Array.from(buckets.entries()).map(([department, positions]) => ({
    department,
    positions,
  }));
}
