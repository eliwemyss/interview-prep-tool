import axios from 'axios';
import {
  AnalyticsResponse,
  ChecklistItem,
  Company,
  FeedbackEntry,
  ResearchData,
  SalaryEntry,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Research endpoints
export const researchAPI = {
  direct: (data: {
    companyName: string;
    companyUrl?: string;
    role: string;
    deepMode: boolean;
  }) => api.post<{ jobId: string }>('/api/research-direct', data),

  status: (jobId: string) =>
    api.get(`/api/research-status/${jobId}`),

  batch: (companies: string[]) =>
    api.post('/api/research-batch', { companies }),

  batchStatus: (batchId: string) =>
    api.get(`/api/batch-status/${batchId}`),
};

// Pipeline endpoints
export const pipelineAPI = {
  getAll: () => api.get<{ success: boolean; count: number; companies: Company[] }>('/api/pipeline'),

  add: (company: {
    companyName: string;
    stage?: string;
    nextInterview?: string;
    notes?: string;
  }) => api.post('/api/pipeline', company),

  update: (id: number, data: Partial<Company>) =>
    api.put(`/api/pipeline/${id}`, data),

  delete: (id: number) =>
    api.delete(`/api/pipeline/${id}`),

  refresh: (id: number) =>
    api.post(`/api/pipeline/${id}/refresh`, {}),
};

// Analytics endpoints
export const analyticsAPI = {
  getPipeline: () => api.get<AnalyticsResponse>('/api/analytics/pipeline'),
};

// Checklist endpoints
export const checklistAPI = {
  get: (companyId: number) => api.get<{ success: boolean; checklist: ChecklistItem[] }>(`/api/pipeline/${companyId}/checklist`),
  add: (companyId: number, items: string[]) => api.post(`/api/pipeline/${companyId}/checklist`, { items }),
  toggle: (itemId: number, completed: boolean) =>
    api.patch(`/api/pipeline/checklist/${itemId}/toggle`, { completed }),
};

// Salary endpoints
export const salaryAPI = {
  get: (companyId: number) => api.get<{ success: boolean; salary: SalaryEntry[] }>(`/api/pipeline/${companyId}/salary`),
  add: (companyId: number, salary: Partial<SalaryEntry>) => api.post(`/api/pipeline/${companyId}/salary`, salary),
};

// Feedback endpoints
export const feedbackAPI = {
  get: (companyId: number) => api.get<{ success: boolean; feedback: FeedbackEntry[] }>(`/api/pipeline/${companyId}/feedback`),
  add: (companyId: number, payload: Partial<FeedbackEntry>) => api.post(`/api/pipeline/${companyId}/feedback`, payload),
};

// Calendar endpoints
export const calendarAPI = {
  sync: () => api.post('/api/calendar/sync'),
  getEvents: () => api.get('/api/calendar/events'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
