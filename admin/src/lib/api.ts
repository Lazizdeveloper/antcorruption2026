import {
  AdminNotification,
  AdminProfile,
  Candidate,
  Case,
  ExternalProject,
  IntegrityReport,
  NewsItem,
  RiskStats,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ethicflow-admin-token';
const DEMO_CREDENTIALS = {
  email: 'admin@ethicflow.uz',
  password: 'Admin123!',
};

type JsonValue = Record<string, unknown>;

export interface AdminDashboardResponse {
  stats: RiskStats;
  cases: Case[];
  candidates: Candidate[];
  profile: AdminProfile;
  riskDistribution: Array<{ name: string; count: number; fill: string }>;
  timelineData: Array<{ name: string; value: number }>;
  soliqGraphData: Array<{ name: string; entities: number; individuals: number }>;
  externalProjects: ExternalProject[];
  newsItems: NewsItem[];
  notifications: AdminNotification[];
}

async function login(force = false) {
  if (!force) {
    const cachedToken = window.localStorage.getItem(TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(DEMO_CREDENTIALS),
  });

  if (!response.ok) {
    throw new Error('Admin login failed');
  }

  const payload = await response.json();
  window.localStorage.setItem(TOKEN_KEY, payload.token);
  return payload.token as string;
}

async function requestJson<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await login();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 && retry) {
    window.localStorage.removeItem(TOKEN_KEY);
    return requestJson<T>(path, init, false);
  }

  if (!response.ok) {
    let message = 'Request failed';

    try {
      const errorPayload = (await response.json()) as JsonValue;
      message = String(errorPayload.message ?? message);
    } catch {
      message = await response.text();
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error("Rasm faylini o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

async function requestBlob(path: string, retry = true) {
  const token = await login();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 && retry) {
    window.localStorage.removeItem(TOKEN_KEY);
    return requestBlob(path, false);
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.blob();
}

export function fetchDashboard() {
  return requestJson<AdminDashboardResponse>('/api/admin/dashboard');
}

export async function uploadProfileImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const payload = await requestJson<{ url: string }>(
    '/api/uploads/profile-image',
    {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        contentBase64: dataUrl.split(',')[1] ?? '',
      }),
    },
  );

  return payload.url;
}

export async function updateProfile(profile: AdminProfile) {
  const payload = await requestJson<{ profile: AdminProfile }>(
    '/api/admin/profile',
    {
      method: 'PUT',
      body: JSON.stringify(profile),
    },
  );

  return payload.profile;
}

export async function fetchReports() {
  const payload = await requestJson<{ reports: IntegrityReport[] }>('/api/admin/reports');
  return payload.reports;
}

export async function createReport(report: {
  reportType: 'case' | 'candidate' | 'application' | 'system';
  referenceId?: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}) {
  const payload = await requestJson<{ report: IntegrityReport }>(
    '/api/admin/reports',
    {
      method: 'POST',
      body: JSON.stringify(report),
    },
  );

  return payload.report;
}

export async function downloadDashboardExport() {
  return requestBlob('/api/admin/export/dashboard.csv');
}

export async function downloadReportsExport() {
  return requestBlob('/api/admin/reports/export.csv');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
