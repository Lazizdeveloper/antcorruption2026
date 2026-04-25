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

export interface Candidate {
  id: string;
  score: number;
  conflictRisk: 'Low' | 'High';
  conflictDetails?: string;
  department: string;
  matchPercentage: number;
  interviewTime?: string;
  proctoringRisk?: number;
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
}
