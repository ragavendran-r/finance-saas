import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
