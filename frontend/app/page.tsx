'use client';

import { useEffect, useMemo, useState } from 'react';
import AnalyticsHeader from '@/components/AnalyticsHeader';
import PipelineBoard from '@/components/PipelineBoard';
import ResearchModal from '@/components/ResearchModal';
import JobToast from '@/components/JobToast';
import ErrorToast from '@/components/ErrorToast';
import { analyticsAPI, calendarAPI, checklistAPI, feedbackAPI, gmailAPI, pipelineAPI, salaryAPI } from '@/lib/api';
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
  const [jobToast, setJobToast] = useState<{ message: string; status: 'queued' | 'running' | 'done' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return companies.filter((c) => {
      const matchesStage = stageFilter === 'all' || c.stage === stageFilter;
      const matchesSearch = term
        ? c.name.toLowerCase().includes(term) || (c.notes || '').toLowerCase().includes(term)
        : true;
      return matchesStage && matchesSearch;
    });
  }, [companies, searchTerm, stageFilter]);

  // Initial load: pipeline + analytics + auto calendar sync
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

        // Auto-sync calendar on mount (silent fail if not configured)
        try {
          await calendarAPI.sync();
          const refreshed = await pipelineAPI.getAll();
          setCompanies(refreshed.data.companies || []);
        } catch (syncErr) {
          // Silent fail - calendar might not be configured
          console.log('Calendar sync skipped:', syncErr);
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
    setJobToast({ message: 'Research queued...', status: 'queued' });
    setModalBusy(true);
    try {
      setJobToast({ message: 'Research running...', status: 'running' });
      await pipelineAPI.refresh(id);
      const pipelineRes = await pipelineAPI.getAll();
      setCompanies(pipelineRes.data.companies || []);
      setJobToast({ message: 'Research complete', status: 'done' });
      setTimeout(() => setJobToast(null), 1500);
    } catch (err) {
      setInlineError('Refresh failed');
      setJobToast(null);
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

  const checklistProgress = useMemo(() => {
    const progress: Record<number, { done: number; total: number }> = {};
    Object.entries(checklists).forEach(([cid, items]) => {
      const total = items.length;
      const done = items.filter((i) => i.completed).length;
      progress[Number(cid)] = { done, total };
    });
    return progress;
  }, [checklists]);

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
          <button
            onClick={async () => {
              try {
                setJobToast({ message: 'Syncing calendar...', status: 'queued' });
                await calendarAPI.sync();
                const refreshed = await pipelineAPI.getAll();
                setCompanies(refreshed.data.companies || []);
                setJobToast({ message: 'Calendar synced', status: 'done' });
                setTimeout(() => setJobToast(null), 1500);
              } catch (err: any) {
                setInlineError(err?.response?.data?.message || 'Calendar sync failed');
                setJobToast(null);
              }
            }}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Sync Calendar
          </button>
          <button
            onClick={async () => {
              try {
                setJobToast({ message: 'Syncing Gmail...', status: 'queued' });
                await gmailAPI.sync();
                const refreshed = await pipelineAPI.getAll();
                setCompanies(refreshed.data.companies || []);
                setJobToast({ message: 'Gmail synced', status: 'done' });
                setTimeout(() => setJobToast(null), 1500);
              } catch (err: any) {
                setInlineError(err?.response?.data?.message || 'Gmail sync failed');
                setJobToast(null);
              }
            }}
            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Sync Gmail
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company/notes"
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as Stage | 'all')}
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All stages</option>
            <option value="research">Research</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="technical">Technical</option>
            <option value="final">Final</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {inlineError && (
        <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {inlineError}
        </div>
      )}

      <AnalyticsHeader analytics={analytics} />

      <PipelineBoard
        companies={filteredCompanies}
        onStageChange={handleStageChange}
        onSelect={(id) => selectCompany(id)}
        onRefresh={handleRefreshResearch}
        checklistProgress={checklistProgress}
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

      <JobToast toast={jobToast} />
      <ErrorToast message={inlineError} onClear={() => setInlineError(null)} />
    </div>
  );
}
