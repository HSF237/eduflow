import React from 'react';
import { Skeleton } from './skeleton';

export function DashboardSkeleton() {
  return (
    <div 
      role="status" 
      aria-busy="true" 
      aria-label="Loading dashboard content..."
      className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn"
    >
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 bg-slate-200" />
          <Skeleton className="h-4 w-48 bg-slate-100" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg bg-slate-200" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28 bg-slate-200" />
              <Skeleton className="h-8 w-8 rounded-full bg-slate-200" />
            </div>
            <Skeleton className="h-8 w-20 bg-slate-200" />
            <Skeleton className="h-3 w-36 bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Main Content & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <Skeleton className="h-6 w-40 bg-slate-200" />
          <TableSkeleton rows={4} cols={4} />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <Skeleton className="h-6 w-32 bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border border-slate-100 rounded-lg space-y-2">
                <Skeleton className="h-4 w-3/4 bg-slate-200" />
                <Skeleton className="h-3 w-1/2 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading section content, please wait...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading table..." className="w-full space-y-3">
      <div className="flex gap-4 border-b border-slate-200 pb-3">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1 bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2.5 border-b border-slate-100 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 bg-slate-100" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table contents...</span>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 bg-slate-200" />
              <Skeleton className="h-3 w-1/2 bg-slate-100" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-md bg-slate-100" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-24 rounded-lg bg-slate-200" />
            <Skeleton className="h-4 w-16 bg-slate-100" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading card items...</span>
    </div>
  );
}
