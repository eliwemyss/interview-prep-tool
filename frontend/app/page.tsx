'use client';

import { useEffect, useMemo, useState } from 'react';
import AnalyticsHeader from '@/components/AnalyticsHeader';
import PipelineBoard from '@/components/PipelineBoard';
import ResearchModal from '@/components/ResearchModal';
import { analyticsAPI, checklistAPI, feedbackAPI, pipelineAPI, salaryAPI } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Company, Stage } from '@/lib/types';

export default function DashboardPage() {
  const {
    companies,
    setCompanies,
    updateCompanyStage,
    selectCompany,
    selectedCompanyId,
    checklists,
    setChecklist,
    salary,
    setSalary,
    feedback,
    setFeedback,
    analytics,
    setAnalytics,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [modalBusy, setModalBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  // Initial load: pipeline + analytics
  useEffect(() => {
    const load = async () => {
      try {
        const [pipelineRes, analyticsRes] = await Promise.all([
          pipelineAPI.getAll(),
          analyticsAPI.getPipeline().catch(() => null),
        ]);

        const fetchedCompanies: Company[] = pipelineRes.data.companies || [];
        setCompanies(fetchedCompanies);
        if (analyticsRes?.data) {
          setAnalytics(analyticsRes.data);
        }
      } catch (err: any) {
        setInlineError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [setCompanies, setAnalytics]);

  // Fetch modal data when selection changes
  useEffect(() => {
    const loadAux = async () => {
      if (!selectedCompanyId) return;
      try {
        const [checklistRes, salaryRes, feedbackRes] = await Promise.all([
          checklists[selectedCompanyId]
            ? Promise.resolve(null)
            : checklistAPI.get(selectedCompanyId),
          salary[selectedCompanyId]
            ? Promise.resolve(null)
            : salaryAPI.get(selectedCompanyId),
          feedback[selectedCompanyId]
            ? Promise.resolve(null)
            : feedbackAPI.get(selectedCompanyId),
        ]);

        if (checklistRes?.data) setChecklist(selectedCompanyId, checklistRes.data.checklist);
        if (salaryRes?.data) setSalary(selectedCompanyId, salaryRes.data.salary);
        if (feedbackRes?.data) setFeedback(selectedCompanyId, feedbackRes.data.feedback);
      } catch (err) {
        // soft fail
      }
    };

    loadAux();
  }, [selectedCompanyId, checklists, salary, feedback, setChecklist, setSalary, setFeedback]);

  const handleStageChange = async (id: number, stage: Stage) => {
    updateCompanyStage(id, stage);
    try {
      await pipelineAPI.update(id, { stage });
    } catch (err) {
      setInlineError('Failed to update stage');
    }
  };

  const handleRefreshResearch = async (id: number) => {
    setModalBusy(true);
    try {
      await pipelineAPI.refresh(id);
      const pipelineRes = await pipelineAPI.getAll();
      setCompanies(pipelineRes.data.companies || []);
    } catch (err) {
      setInlineError('Refresh failed');
    } finally {
      setModalBusy(false);
    }
  };

  const handleToggleChecklist = async (itemId: number, completed: boolean) => {
    if (!selectedCompanyId) return;
    const existing = checklists[selectedCompanyId] || [];
    setChecklist(
      selectedCompanyId,
      existing.map((item) => (item.id === itemId ? { ...item, completed } : item))
    );

    try {
      const res = await checklistAPI.toggle(itemId, completed);
      setChecklist(
        selectedCompanyId,
        existing.map((item) => (item.id === itemId ? res.data.item : item))
      );
    } catch (err) {
      setInlineError('Unable to update checklist');
    }
  };

  const handleAddChecklist = async (text: string) => {
    if (!selectedCompanyId) return;
    setModalBusy(true);
    try {
      const res = await checklistAPI.add(selectedCompanyId, [text]);
      const existing = checklists[selectedCompanyId] || [];
      setChecklist(selectedCompanyId, [...existing, ...(res.data.items || [])]);
    } catch (err) {
      setInlineError('Unable to add checklist item');
    } finally {
      setModalBusy(false);
    }
  };

  const handleAddFeedback = async (payload: any) => {
    if (!selectedCompanyId) return;
    setModalBusy(true);
    try {
      const res = await feedbackAPI.add(selectedCompanyId, payload);
      const existing = feedback[selectedCompanyId] || [];
      setFeedback(selectedCompanyId, [res.data.feedback, ...existing]);
    } catch (err) {
      setInlineError('Unable to save feedback');
    } finally {
      setModalBusy(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      const res = await pipelineAPI.add({ companyName: newCompanyName.trim(), stage: 'research' });
      const refreshed = await pipelineAPI.getAll();
      setCompanies(refreshed.data.companies || []);
      setNewCompanyName('');
    } catch (err) {
      setInlineError('Failed to add company');
    }
  };

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Pipeline</p>
          <h1 className="text-3xl font-semibold text-white">Interview Control Center</h1>
          <p className="text-slate-400">Live analytics, research, checklists, and salary intel.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="Add company to pipeline"
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button
            onClick={handleAddCompany}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Add
          </button>
        </div>
      </div>

      {inlineError && (
        <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {inlineError}
        </div>
      )}

      <AnalyticsHeader analytics={analytics} />

      <PipelineBoard
        companies={companies}
        onStageChange={handleStageChange}
        onSelect={(id) => selectCompany(id)}
        onRefresh={handleRefreshResearch}
      />

      {selectedCompany && (
        <ResearchModal
          companyName={selectedCompany.name}
          research={(selectedCompany.researchData as any) || null}
          checklist={checklists[selectedCompany.id] || []}
          salary={salary[selectedCompany.id] || []}
          feedback={feedback[selectedCompany.id] || []}
          onClose={() => selectCompany(null)}
          onToggleChecklist={handleToggleChecklist}
          onAddChecklist={handleAddChecklist}
          onRefreshResearch={() => handleRefreshResearch(selectedCompany.id)}
          onAddFeedback={handleAddFeedback}
          busy={modalBusy}
        />
      )}
    </div>
  );
}
