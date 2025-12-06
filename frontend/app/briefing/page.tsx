'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import BriefingContent from '@/components/BriefingContent';

function BriefingPageContent() {
  const searchParams = useSearchParams();
  const { researchResults } = useAppStore();
  const company = searchParams.get('company');

  const result = researchResults.find(
    (r) => r.company.toLowerCase() === company?.toLowerCase()
  );

  if (!result) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Briefing
          </h1>
          <p className="text-gray-600 mt-4">
            No research data found. Please run a company research first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {result.company}
        </h1>
        <p className="text-lg text-purple-600 font-semibold">{result.role}</p>
      </div>

      {result.briefing && <BriefingContent briefing={result.briefing} />}

      {result.data && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Research Details
          </h2>
          <div className="prose max-w-none">
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BriefingPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BriefingPageContent />
    </Suspense>
  );
}
