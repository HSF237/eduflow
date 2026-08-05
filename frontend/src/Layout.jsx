import React from 'react';

export default function Layout({ children, currentPageName }) {
  // Always render children cleanly for all routes
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}
