import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
        ${error
          ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
        }
        disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white
        ${error
          ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
        }
        disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors resize-none
        ${error
          ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
        }
        disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
      {...props}
    />
  );
}
