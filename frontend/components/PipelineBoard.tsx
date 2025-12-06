import { Company, Stage } from '@/lib/types';

const COLUMNS: { key: Stage; title: string; tone: string; hint: string }[] = [
  { key: 'research', title: 'Research', tone: 'from-slate-800 to-slate-900', hint: 'Need fresh intel' },
  { key: 'applied', title: 'Applied', tone: 'from-sky-800 to-sky-900', hint: 'Awaiting response' },
  { key: 'screening', title: 'Screening', tone: 'from-cyan-800 to-cyan-900', hint: 'Recruiter/phone' },
  { key: 'technical', title: 'Technical', tone: 'from-indigo-800 to-indigo-900', hint: 'Coding/system' },
  { key: 'final', title: 'Final', tone: 'from-amber-700 to-amber-900', hint: 'Loop/exec' },
  { key: 'offer', title: 'Offer', tone: 'from-emerald-700 to-emerald-900', hint: 'Decision time' },
];

interface PipelineBoardProps {
  companies: Company[];
  onStageChange: (id: number, stage: Stage) => void;
  onSelect: (id: number) => void;
  onRefresh: (id: number) => void;
  checklistProgress?: Record<number, { done: number; total: number }>;
}

export default function PipelineBoard({ companies, onStageChange, onSelect, onRefresh, checklistProgress = {} }: PipelineBoardProps) {
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (!id) return;
    onStageChange(id, stage);
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {COLUMNS.map((column) => {
        const items = companies.filter((c) => c.stage === column.key);
        return (
          <div
            key={column.key}
            className="space-y-3"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            <div className={`rounded-lg border border-slate-800 bg-gradient-to-r ${column.tone} px-3 py-2`}> 
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200 font-semibold">{column.title}</p>
                  <p className="text-xs text-slate-400">{column.hint}</p>
                </div>
                <span className="text-sm text-slate-300">{items.length}</span>
              </div>
            </div>
            <div className="space-y-3">
              {items.map((company) => (
                <article
                  key={company.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur px-3 py-3 shadow-lg shadow-slate-900/40"
                  draggable
                  onDragStart={(e) => handleDragStart(e, company.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-slate-50 font-semibold leading-tight">{company.name}</h3>
                      <p className="text-xs text-slate-400">{company.notes || 'No notes yet'}</p>
                    </div>
                    <button
                      onClick={() => onRefresh(company.id)}
                      className="text-xs text-sky-300 hover:text-sky-100 underline"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                    {company.nextInterview && (
                      <p>Next: {new Date(company.nextInterview).toLocaleString()}</p>
                    )}
                    {company.lastResearched && (
                      <p>Researched: {new Date(company.lastResearched).toLocaleDateString()}</p>
                    )}
                    {checklistProgress[company.id] && checklistProgress[company.id].total > 0 && (
                      <p>
                        Checklist: {checklistProgress[company.id].done}/{checklistProgress[company.id].total}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => onSelect(company.id)}
                      className="rounded-md bg-sky-700 px-3 py-1 font-semibold text-white hover:bg-sky-600"
                    >
                      Open
                    </button>
                    <select
                      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                      value={company.stage}
                      onChange={(e) => onStageChange(company.id, e.target.value as Stage)}
                    >
                      {COLUMNS.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.title}
                        </option>
                      ))}
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </article>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
                  No cards here yet.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
