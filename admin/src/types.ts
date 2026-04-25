/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Case {
  id: string;
  name: string;
  organization: string;
  type: 'Tender' | 'Document';
  riskScore: number;
  description: string;
  anomalies: string[];
}

export interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  photoUrl: string;
}

export interface Candidate {
  id: string;
  candidateName: string;
  position: string;
  status: string;
  score: number;
  conflictRisk: 'Low' | 'High';
  conflictDetails?: string;
  department: string;
  matchPercentage: number;
  interviewTime?: string;
  proctoringRisk?: number;
  hiringAlert?: ConflictHireAlert | null;
}

export interface ConflictHirePerson {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  telegram?: string | null;
  position?: string | null;
  department?: string | null;
  conflictDetails?: string | null;
}

export interface ConflictHireRiskFlags {
  lowAiScore?: boolean;
  auditConflict?: boolean;
}

export interface ConflictHireAlert {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  organization: string;
  reasonSummary?: string | null;
  riskFlags?: ConflictHireRiskFlags | null;
  aiScore?: number | null;
  auditStatus?: string | null;
  hr?: ConflictHirePerson | null;
  candidate: ConflictHirePerson;
}

export interface IntegrityReportDetails {
  kind?: string;
  organization?: string;
  reasonSummary?: string | null;
  riskFlags?: ConflictHireRiskFlags | null;
  aiScore?: number | null;
  auditStatus?: string | null;
  hr?: ConflictHirePerson | null;
  candidate?: ConflictHirePerson | null;
}

export interface ExternalProject {
  title: string;
  url: string;
  published_date: string;
  document_type?: string;
  source: string;
}

export interface AuctionLot {
  id: number;
  name: string;
  category: string;
  start_price: number;
  auction_date: string;
  address: string;
}

export interface Procurement {
  id: number;
  category: string;
  cost: number;
  region: string;
  deadline: string;
}

export interface NewsItem {
  title: string;
  url: string;
  published_date: string;
  summary: string;
  image_url: string;
}

export interface RiskStats {
  highRiskCases: number;
  totalCases: number;
  potentialSavings: string;
}

export interface IntegrityReport {
  id: string;
  reportType: 'case' | 'candidate' | 'application' | 'system';
  referenceId?: string | null;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'reviewing' | 'resolved';
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  details?: IntegrityReportDetails | null;
}

export interface AdminNotification {
  id: string;
  text: string;
  type: 'error' | 'success' | 'info';
  createdAt: string;
}
