interface ErrorToastProps {
  message: string | null;
  onClear: () => void;
}

export default function ErrorToast({ message, onClear }: ErrorToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="rounded-xl border border-red-500 bg-red-900/70 px-4 py-3 shadow-xl backdrop-blur text-red-100">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-red-300 animate-pulse" aria-hidden />
          <div className="text-sm font-semibold flex-1">{message}</div>
          <button
            onClick={onClear}
            className="text-xs text-red-100 underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
