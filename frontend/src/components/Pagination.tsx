import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-[#12141e] border-t border-slate-200 dark:border-[#1e2233] text-xs font-medium text-slate-500 dark:text-slate-400 select-none ${className}`}>
      <div>
        Page {safeCurrentPage} of {safeTotalPages}
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Previous Page"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1e2233] bg-white dark:bg-[#12141e] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181b28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
          aria-label="Next Page"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1e2233] bg-white dark:bg-[#12141e] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181b28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
