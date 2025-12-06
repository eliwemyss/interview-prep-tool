interface JobToastProps {
  toast: { message: string; status: 'queued' | 'running' | 'done' } | null;
}

export default function JobToast({ toast }: JobToastProps) {
  if (!toast) return null;

  const tone =
    toast.status === 'done'
      ? 'border-emerald-500 text-emerald-100 bg-emerald-900/60'
      : 'border-sky-500 text-sky-100 bg-sky-900/60';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`rounded-xl border px-4 py-3 shadow-xl backdrop-blur ${tone}`}>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-current animate-pulse" aria-hidden />
          <div className="text-sm font-semibold">{toast.message}</div>
        </div>
      </div>
    </div>
  );
}
