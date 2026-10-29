import React, { ReactNode } from 'react';
import { Loader2, FolderOpen, AlertCircle, RefreshCw } from 'lucide-react';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-indigo-500 dark:text-indigo-400 animate-spin mb-3`} />
      {message && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1b1e2e] flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">{title}</h4>
          <p className="text-xs mt-1 text-rose-600/90 dark:text-rose-400/90 leading-relaxed">{message}</p>
          {(onRetry || onDismiss) && (
            <div className="flex items-center space-x-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <span>Retry</span>
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-xs text-rose-600/80 hover:text-rose-600 font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
