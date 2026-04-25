export type ApplicationStatus = 'submitted' | 'blind_review' | 'merit_test' | 'ranking' | 'completed';

export interface ApplicationDocument {
  name: string;
  type: string;
  url: string;
  mimeType?: string;
  sizeKb?: number;
}

export interface Candidate {
  id: string;
  name: string;
  surname: string;
  gender: string;
  birthPlace: string;
  photoUrl: string;
  email: string;
  phone: string;
  connections: string[]; // e.g. ["Relative: John Doe (Manager)"]
}

export interface Application {
  id: string;
  candidateId: string;
  candidateCode?: string;
  position: string;
  department: string;
  status: ApplicationStatus;
  documents: ApplicationDocument[];
  meritScore: number;
  score?: number;
  reviewStatus?: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  blindMode: boolean;
  conflictDetected?: boolean;
  conflictDetails?: string | null;
  phone?: string | null;
  telegram?: string | null;
  maskedData?: {
    skills?: string[];
    experience?: string;
    education?: string;
    summary?: string;
  };
  matchPercentage?: number;
  interviewTime?: string | null;
  submittedAt: string;
  updatedAt?: string;
}

export interface MeritQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface VacancyGroup {
  department: string;
  positions: string[];
}

export interface RankingPreviewRow {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
  blocked?: boolean;
}
