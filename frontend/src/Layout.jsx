import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-slate-50 text-slate-900 focus:outline-none">
      {children}
    </main>
  );
}
