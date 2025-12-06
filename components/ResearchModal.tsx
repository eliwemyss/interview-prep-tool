import { useMemo, useState } from 'react';
import { ChecklistItem, FeedbackEntry, ResearchData, SalaryEntry } from '@/lib/types';

interface ResearchModalProps {
  companyName: string;
  research: ResearchData | null;
  checklist: ChecklistItem[];
  salary: SalaryEntry[];
  feedback: FeedbackEntry[];
  onClose: () => void;
  onToggleChecklist: (itemId: number, completed: boolean) => Promise<void>;
  onAddChecklist: (text: string) => Promise<void>;
  onRefreshResearch: () => Promise<void>;
  onAddFeedback: (payload: Partial<FeedbackEntry>) => Promise<void>;
  busy?: boolean;
}

type Tab = 'research' | 'prep' | 'salary' | 'feedback';

export default function ResearchModal({
  companyName,
  research,
  checklist,
  salary,
  feedback,
  onClose,
  onToggleChecklist,
  onAddChecklist,
  onRefreshResearch,
  onAddFeedback,
  busy,
}: ResearchModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('research');
  const [newChecklist, setNewChecklist] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState({
    difficulty_rating: 3,
    energy_level: 3,
    questions_asked: '',
    outcome: '',
    notes: '',
  });

  const prepItems = research?.prepChecklist || [];

  const renderResearch = () => (
    <div className="space-y-4">
      {research?.executiveSummary && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold text-slate-50">Executive Summary</h3>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">{research.executiveSummary}</p>
        </div>
      )}
      {research?.keyTalkingPoints && research.keyTalkingPoints.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold text-slate-50">Talking Points</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {research.keyTalkingPoints.map((pt, idx) => (
              <li key={idx}>• {pt}</li>
            ))}
          </ul>
        </div>
      )}
      {research?.smartQuestions && research.smartQuestions.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold text-slate-50">Smart Questions</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {research.smartQuestions.map((q, idx) => (
              <li key={idx}>? {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderPrep = () => (
    <div className="space-y-3">
      {checklist.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggleChecklist(item.id, !item.completed)}
            className="h-4 w-4"
          />
          <span className={item.completed ? 'line-through text-slate-500' : ''}>{item.item}</span>
        </label>
      ))}
      {prepItems.length > 0 && checklist.length === 0 && (
        <p className="text-slate-400 text-sm">Checklist will populate after refresh.</p>
      )}
      <div className="flex gap-2 pt-2">
        <input
          value={newChecklist}
          onChange={(e) => setNewChecklist(e.target.value)}
          placeholder="Add checklist item"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
        <button
          onClick={async () => {
            if (!newChecklist.trim()) return;
            await onAddChecklist(newChecklist.trim());
            setNewChecklist('');
          }}
          className="rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          disabled={busy}
        >
          Add
        </button>
      </div>
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-3">
      {salary.length === 0 && <p className="text-sm text-slate-400">No salary data yet.</p>}
      {salary.map((row) => (
        <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100">
          {row.job_role && <p className="font-semibold">{row.job_role}</p>}
          <p className="text-slate-300">Total: {row.total_comp_min || '—'} - {row.total_comp_max || '—'}</p>
          <p className="text-slate-400 text-xs">Source: {row.source || 'unknown'}</p>
        </div>
      ))}
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-4">
      <div className="space-y-2 text-sm text-slate-200">
        {feedback.length === 0 && <p className="text-slate-400">No feedback logged yet.</p>}
        {feedback.map((fb) => (
          <div key={fb.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="font-semibold">Outcome: {fb.outcome || 'pending'}</p>
            <p>Difficulty: {fb.difficulty_rating}/5 · Energy: {fb.energy_level}/5</p>
            {fb.questions_asked?.length > 0 && (
              <p className="text-slate-300">Questions: {fb.questions_asked.join(', ')}</p>
            )}
            {fb.notes && <p className="text-slate-200 mt-1">{fb.notes}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-50">Add interview feedback</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-slate-300 text-xs">Difficulty (1-5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={feedbackDraft.difficulty_rating}
              onChange={(e) => setFeedbackDraft({ ...feedbackDraft, difficulty_rating: Number(e.target.value) })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-300 text-xs">Energy (1-5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={feedbackDraft.energy_level}
              onChange={(e) => setFeedbackDraft({ ...feedbackDraft, energy_level: Number(e.target.value) })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-300 text-xs">Questions asked (comma separated)</span>
            <input
              type="text"
              value={feedbackDraft.questions_asked}
              onChange={(e) => setFeedbackDraft({ ...feedbackDraft, questions_asked: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-300 text-xs">Outcome</span>
            <input
              type="text"
              value={feedbackDraft.outcome}
              onChange={(e) => setFeedbackDraft({ ...feedbackDraft, outcome: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-300 text-xs">Notes</span>
            <textarea
              value={feedbackDraft.notes}
              onChange={(e) => setFeedbackDraft({ ...feedbackDraft, notes: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              rows={3}
            />
          </label>
        </div>
        <button
          onClick={async () => {
            await onAddFeedback({
              difficulty_rating: feedbackDraft.difficulty_rating,
              energy_level: feedbackDraft.energy_level,
              questions_asked: feedbackDraft.questions_asked
                ? feedbackDraft.questions_asked.split(',').map((q) => q.trim()).filter(Boolean)
                : [],
              outcome: feedbackDraft.outcome,
              notes: feedbackDraft.notes,
            });
            setFeedbackDraft({ difficulty_rating: 3, energy_level: 3, questions_asked: '', outcome: '', notes: '' });
          }}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          disabled={busy}
        >
          Save feedback
        </button>
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'research', label: 'Research' },
    { key: 'prep', label: 'Prep' },
    { key: 'salary', label: 'Salary' },
    { key: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-slate-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Company</p>
            <h2 className="text-2xl font-semibold text-white">{companyName}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefreshResearch}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-sky-200 hover:border-sky-400"
              disabled={busy}
            >
              Refresh research
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeTab === tab.key
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
          {activeTab === 'research' && renderResearch()}
          {activeTab === 'prep' && renderPrep()}
          {activeTab === 'salary' && renderSalary()}
          {activeTab === 'feedback' && renderFeedback()}
        </div>
      </div>
    </div>
  );
}
