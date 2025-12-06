'use client';

import Link from 'next/link';
import { ResearchResult } from '@/lib/store';

interface ResearchResultsProps {
  results: ResearchResult[];
  error: string | null;
}

export default function ResearchResults({ results, error }: ResearchResultsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-semibold">Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No research results yet. Start by researching a company.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{result.company}</h3>
              <p className="text-purple-600 font-semibold">{result.role}</p>
            </div>
            <Link
              href={`/briefing?company=${encodeURIComponent(result.company)}`}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              View Briefing
            </Link>
          </div>

          {result.briefing && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">AI Briefing Summary</h4>
              <p className="text-gray-700 text-sm line-clamp-3">
                {result.briefing.executiveSummary}
              </p>
            </div>
          )}

          {result.data && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Research Data</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {result.data.companyDescription && (
                  <p><strong>About:</strong> {result.data.companyDescription.slice(0, 100)}...</p>
                )}
                {result.data.averageSalary && (
                  <p><strong>Average Salary:</strong> ${result.data.averageSalary.toLocaleString()}</p>
                )}
                {result.data.salaryRange && (
                  <p><strong>Salary Range:</strong> ${result.data.salaryRange.min.toLocaleString()} - ${result.data.salaryRange.max.toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
