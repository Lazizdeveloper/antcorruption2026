import { Anomaly, Application, DashboardSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ethicflow-hr-token';
const DEMO_CREDENTIALS = {
  email: 'hr@ethicflow.uz',
  password: 'Hr123!',
};

type JsonValue = Record<string, unknown>;

export interface HrDashboardResponse {
  summary: DashboardSummary;
  applications: Application[];
  anomalies: Anomaly[];
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
    throw new Error('HR login failed');
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
  return requestJson<HrDashboardResponse>('/api/hr/dashboard');
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Application['status'],
) {
  const payload = await requestJson<{ application: Application }>(
    `/api/hr/applications/${applicationId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );

  return payload.application;
}

export function downloadApplicationsExport() {
  return requestBlob('/api/hr/export/applications.csv');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
