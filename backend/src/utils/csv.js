function escapeCsvValue(value) {
  const normalized = value === null || value === undefined ? '' : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function toCsv(rows) {
  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
}
