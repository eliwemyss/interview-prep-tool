export type Stage =
  | 'research'
  | 'applied'
  | 'screening'
  | 'technical'
  | 'final'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface ChecklistItem {
  id: number;
  company_id: number;
  item: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryEntry {
  id: number;
  company_id: number;
  job_role?: string;
  base_min?: number;
  base_max?: number;
  bonus_min?: number;
  bonus_max?: number;
  equity_value?: number;
  signing_bonus?: number;
  total_comp_min?: number;
  total_comp_max?: number;
  source?: string;
  last_updated?: string;
}

export interface FeedbackEntry {
  id: number;
  company_id: number;
  difficulty_rating: number;
  energy_level: number;
  questions_asked: string[];
  notes?: string;
  outcome?: string;
  interview_date?: string;
  created_at?: string;
}

export interface ResearchData {
  companyName: string;
  overview?: string;
  products?: string[];
  techStack?: string[];
  averageSalary?: number;
  salaryRange?: { min: number; max: number };
  interviewQuestions?: string[];
  preparationTips?: string[];
  keyTopics?: string[];
  companyValues?: string[];
  executiveSummary?: string;
  keyTalkingPoints?: string[];
  topChallenges?: string[];
  cultureInsights?: string;
  smartQuestions?: string[];
  redFlags?: string[];
  prepChecklist?: string[];
  sources?: {
    website?: string;
    github?: string;
  };
  metadata?: {
    researchedAt?: string;
    role?: string;
    deepMode?: boolean;
    version?: string;
  };
  [key: string]: any;
}

export interface Company {
  id: number;
  name: string;
  stage: Stage;
  nextInterview?: string;
  lastResearched?: string;
  researchData?: ResearchData | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsSummary {
  totalCompanies: number;
  screening: number;
  technical: number;
  final: number;
  offers: number;
  conversionScreeningToTechnical: number;
  conversionTechnicalToFinal: number;
}

export interface AnalyticsResponse {
  success: boolean;
  stages: { stage: Stage; count: number; with_interviews: number; avg_days_in_pipeline: number | null }[];
  upcomingInterviews: Company[];
  summary: AnalyticsSummary;
}
