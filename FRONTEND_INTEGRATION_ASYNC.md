# Frontend Integration: Async Research with Trigger.dev

Update your Next.js frontend to work with the new async research API.

## Changes Needed

### 1. Update `lib/api.ts`

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Research endpoints - NOW ASYNC
export const researchAPI = {
  // Queue async research job (returns jobId)
  direct: (data: {
    companyName: string;
    companyUrl?: string;
    role: string;
    deepMode: boolean;
  }) => api.post('/api/research-direct', data),

  // Poll for job status
  status: (jobId: string) => api.get(`/api/research-status/${jobId}`),

  batch: (companies: string[]) =>
    api.post('/api/research-batch', { companies }),

  batchStatus: (batchId: string) =>
    api.get(`/api/batch-status/${batchId}`),
};

// ... rest of your API client
```

### 2. Update `app/page.tsx` (Research Page)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { researchAPI } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import ResearchForm from '@/components/ResearchForm';
import ResearchResults from '@/components/ResearchResults';

export default function ResearchPage() {
  const { researchResults, addResearchResult, setIsLoading, isLoading, error, setError } =
    useAppStore();

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<string>('');
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll job status every 2 seconds until complete
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const response = await researchAPI.status(jobId);
        const { status, isComplete, isFailed, results, progress } = response.data;

        setJobProgress(`${status} (${progress})`);

        if (isComplete && results) {
          // Job completed - add to results
          const result = {
            company: results.companyName,
            role: results.companyName, // Or track role separately
            data: results,
            briefing: results, // Full briefing included
          };
          addResearchResult(result);
          setJobId(null);
          setIsLoading(false);
          setJobProgress('');
          if (pollInterval) clearInterval(pollInterval);
        } else if (isFailed) {
          // Job failed
          setError('Research job failed. Please try again.');
          setJobId(null);
          setIsLoading(false);
          setJobProgress('');
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (err: any) {
        console.error('Error polling job status:', err);
        // Continue polling even on error
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    const interval = setInterval(poll, 2000);
    setPollInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, isLoading, addResearchResult, setIsLoading, setError]);

  const handleResearch = async (data: {
    companyName: string;
    companyUrl?: string;
    role: string;
    deepMode: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    setJobProgress('queuing...');

    try {
      // Queue the job (returns immediately with jobId)
      const response = await researchAPI.direct(data);
      const newJobId = response.data.jobId;

      console.log(`Research job queued: ${newJobId}`);
      setJobId(newJobId);
      // Polling will start via useEffect
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to queue research job.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Company Research
        </h1>
        <p className="text-gray-600">
          Get AI-powered insights about companies and roles before your interviews.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ResearchForm onSubmit={handleResearch} isLoading={isLoading} />
          
          {/* Show job progress during polling */}
          {jobProgress && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                📊 Status: {jobProgress}
              </p>
              <div className="mt-2 bg-blue-200 rounded-full h-2 w-full overflow-hidden">
                <div className="bg-blue-600 h-full w-3/4 animate-pulse"></div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Researching company... (30-60 seconds)
              </p>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <ResearchResults results={researchResults} error={error} />
        </div>
      </div>
    </div>
  );
}
```

### 3. Update `lib/store.ts` (Zustand Store)

No changes needed! Your store is already compatible. Just make sure it handles the full briefing data:

```typescript
export interface ResearchResult {
  company: string;
  role: string;
  data: any;  // Full research data
  briefing?: any; // Full briefing included
}
```

### 4. Update `components/ResearchResults.tsx`

Minor update to show job status:

```typescript
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
                {result.briefing.overview || result.briefing.executiveSummary}
              </p>
            </div>
          )}

          {result.data && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Research Data</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {result.data.techStack && (
                  <p><strong>Tech Stack:</strong> {result.data.techStack.join(', ')}</p>
                )}
                {result.data.salaryRange && (
                  <p><strong>Salary Range:</strong> ${result.data.salaryRange.min.toLocaleString()} - ${result.data.salaryRange.max.toLocaleString()}</p>
                )}
                {result.data.products && result.data.products.length > 0 && (
                  <p><strong>Products:</strong> {result.data.products.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Key Changes Summary

| Before | After |
|--------|-------|
| `POST /api/research-direct` blocks for 30-60s | Returns `jobId` immediately (<100ms) |
| Response contains full results | Response contains `jobId` + `statusUrl` |
| Frontend receives data directly | Frontend polls `/api/research-status/:jobId` |
| Single concurrent user | Unlimited concurrent users |
| Timeout on slow networks | Automatic retry handling |

## Testing

1. **Start backend**:
```bash
cd interview-prep-tool
npm run dev
```

2. **Start frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

3. **Test the flow**:
   - Go to http://localhost:3000
   - Enter company name, role
   - Click "Research Company"
   - See "Status: queuing..." then "Status: processing..."
   - Wait for results (30-60 seconds)

## Error Handling

If a job fails:
- The polling will eventually get `isFailed: true`
- Show error message to user
- User can retry research

If network is slow:
- Polling continues (no timeout)
- User sees progress message
- Background job keeps processing

## Next: Webhook Support (Optional)

For real-time updates instead of polling, you can add:

```typescript
// Listen for Trigger.dev webhooks
app.post('/api/webhooks/trigger-dev', (req, res) => {
  const { jobId, status, results } = req.body;
  
  // Broadcast to connected clients via WebSocket
  // Or update database and trigger frontend update
  
  res.json({ ok: true });
});
```

Then update frontend to use WebSocket instead of polling.
