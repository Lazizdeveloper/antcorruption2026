import {
  Application,
  Candidate,
  MeritQuestion,
  RankingPreviewRow,
  VacancyGroup,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ethicflow-candidate-token';
const DEMO_CREDENTIALS = {
  email: 'candidate@ethicflow.uz',
  password: 'Candidate123!',
};

type JsonValue = Record<string, unknown>;

export interface CandidateDashboardResponse {
  candidate: Candidate;
  application: Application | null;
  vacancies: VacancyGroup[];
  meritQuestions: MeritQuestion[];
  rankingPreview: RankingPreviewRow[];
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
    throw new Error('Candidate login failed');
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

export function fetchDashboard() {
  return requestJson<CandidateDashboardResponse>('/api/candidate/dashboard');
}

export async function updateProfile(candidate: Partial<Candidate>) {
  const payload = await requestJson<{ candidate: Candidate }>(
    '/api/candidate/profile',
    {
      method: 'PUT',
      body: JSON.stringify(candidate),
    },
  );

  return payload.candidate;
}

export async function createApplication(payload: {
  position: string;
  department: string;
  phone?: string;
  telegram?: string;
  documents: { name: string; type: string; url: string }[];
  maskedData: {
    skills: string[];
    experience: string;
    education: string;
    summary: string;
  };
}) {
  const response = await requestJson<{ application: Application }>(
    '/api/candidate/applications',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return response.application;
}

export async function submitMeritTest(applicationId: string, answers: number[]) {
  const payload = await requestJson<{ score: number; application: Application }>(
    `/api/candidate/applications/${applicationId}/merit-test/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
  );

  return payload;
}
