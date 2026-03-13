import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  message?: string;
}

export function LoadingSpinner({ fullPage, message = 'Loading...' }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
