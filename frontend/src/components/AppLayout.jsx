import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import DashboardSidebar from './DashboardSidebar';
import { Menu, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AppLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine role based on auth user, URL path, or local storage
  const path = location.pathname.toLowerCase();
  let role = 'teacher';
  if (
    path.includes('principal') ||
    path.includes('manageclasses') ||
    path.includes('manageteachers') ||
    path.includes('managestudents') ||
    path.includes('managesubjects') ||
    path.includes('reports') ||
    path.includes('substitutelog') ||
    path.includes('reviewleave') ||
    path.includes('unapprovedabsences') ||
    path.includes('attendanceapproval') ||
    path.includes('manageexams') ||
    path.includes('classcomparison')
  ) {
    role = 'principal';
  } else if (path.includes('parent') || path.includes('applyleave') || path.includes('viewmarks') || path.includes('reportcard')) {
    role = 'parent';
  } else if (authUser?.role) {
    role = authUser.role.toLowerCase();
  }

  const handleLogout = () => {
    if (logout) logout();
    navigate(createPageUrl('RoleSelection'));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Persistent Sidebar on Desktop, Drawer on Mobile */}
      <DashboardSidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        teacherName={authUser?.displayName || authUser?.email || ''}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header with 3-Line Menu Button */}
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 sticky top-0 z-20 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold text-sm tracking-tight">{title || 'EduSphere'}</span>
            </div>
          </div>
        </header>

        {/* Page Body Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
