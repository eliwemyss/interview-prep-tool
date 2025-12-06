import { create } from 'zustand';
import {
  AnalyticsResponse,
  ChecklistItem,
  Company,
  FeedbackEntry,
  ResearchData,
  SalaryEntry,
  Stage,
} from './types';

export interface ResearchResult {
  company: string;
  role: string;
  data: ResearchData;
  briefing?: ResearchData;
}

interface AppState {
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  addCompany: (company: Company) => void;
  updateCompanyStage: (id: number, stage: Stage) => void;
  removeCompany: (id: number) => void;

  selectedCompanyId: number | null;
  selectCompany: (id: number | null) => void;

  researchResults: ResearchResult[];
  setResearchResults: (results: ResearchResult[]) => void;
  addResearchResult: (result: ResearchResult) => void;

  checklists: Record<number, ChecklistItem[]>;
  setChecklist: (companyId: number, items: ChecklistItem[]) => void;
  updateChecklistItem: (companyId: number, item: ChecklistItem) => void;

  salary: Record<number, SalaryEntry[]>;
  setSalary: (companyId: number, salary: SalaryEntry[]) => void;

  feedback: Record<number, FeedbackEntry[]>;
  setFeedback: (companyId: number, feedback: FeedbackEntry[]) => void;

  analytics: AnalyticsResponse | null;
  setAnalytics: (data: AnalyticsResponse | null) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  companies: [],
  setCompanies: (companies) => set({ companies }),
  addCompany: (company) =>
    set((state) => ({
      companies: [...state.companies, company],
    })),
  updateCompanyStage: (id, stage) =>
    set((state) => ({
      companies: state.companies.map((c) =>
        c.id === id ? { ...c, stage } : c
      ),
    })),
  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
    })),

  selectedCompanyId: null,
  selectCompany: (id) => set({ selectedCompanyId: id }),

  researchResults: [],
  setResearchResults: (results) => set({ researchResults: results }),
  addResearchResult: (result) =>
    set((state) => ({
      researchResults: [...state.researchResults, result],
    })),

  checklists: {},
  setChecklist: (companyId, items) =>
    set((state) => ({
      checklists: { ...state.checklists, [companyId]: items },
    })),
  updateChecklistItem: (companyId, item) =>
    set((state) => ({
      checklists: {
        ...state.checklists,
        [companyId]: (state.checklists[companyId] || []).map((i) =>
          i.id === item.id ? item : i
        ),
      },
    })),

  salary: {},
  setSalary: (companyId, salary) =>
    set((state) => ({
      salary: { ...state.salary, [companyId]: salary },
    })),

  feedback: {},
  setFeedback: (companyId, feedback) =>
    set((state) => ({
      feedback: { ...state.feedback, [companyId]: feedback },
    })),

  analytics: null,
  setAnalytics: (data) => set({ analytics: data }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),
}));
