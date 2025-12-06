import { AnalyticsResponse } from '@/lib/types';

interface AnalyticsHeaderProps {
  analytics: AnalyticsResponse | null;
}

export default function AnalyticsHeader({ analytics }: AnalyticsHeaderProps) {
  if (!analytics) return null;

  const cards = [
    {
      label: 'Total companies',
      value: analytics.summary.totalCompanies,
    },
    {
      label: 'Offers',
      value: analytics.summary.offers,
    },
    {
      label: 'Conv. Screen → Tech',
      value: `${analytics.summary.conversionScreeningToTechnical}%`,
    },
    {
      label: 'Conv. Tech → Final',
      value: `${analytics.summary.conversionTechnicalToFinal}%`,
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 px-4 py-3 shadow-lg shadow-slate-900/40"
        >
          <p className="text-sm text-slate-400">{card.label}</p>
          <p className="text-2xl font-semibold text-sky-100">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
