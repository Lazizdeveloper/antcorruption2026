export interface MaskedData {
  skills: string[];
  experience: string;
  education: string;
  summary: string;
}

export interface Application {
  id: string;
  candidateCode: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  department: string;
  score: number;
  meritScore: number;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  candidateStage: 'submitted' | 'blind_review' | 'merit_test' | 'ranking' | 'completed';
  recruiterInfo?: string;
  conflictDetected: boolean;
  conflictDetails?: string;
  phone?: string;
  telegram?: string;
  maskedData: MaskedData;
  documents: { name: string; type: string; url: string }[];
  matchPercentage: number;
  proctoringRisk: number;
  interviewTime?: string;
  processingTimeMs: number;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Anomaly {
  id: string;
  applicationId: string;
  type: 'DELAY' | 'SPEED' | 'CONTRARY_SELECTION';
  message: string;
  severity: 'low' | 'medium' | 'high';
  source?: string;
  timestamp: string;
}

export interface DashboardSummary {
  totalApplications: number;
  pendingCount: number;
  shortlistedCount: number;
  hiredCount: number;
  averageScore: number;
}
