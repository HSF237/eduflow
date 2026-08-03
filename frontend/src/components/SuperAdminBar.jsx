import React from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Crown, Users, GraduationCap, Building2, UserPlus, RefreshCw } from 'lucide-react';

export default function SuperAdminBar() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isSuperAdmin && user?.email?.toLowerCase() !== 'zerox9861@gmail.com') {
    return null;
  }

  const navItems = [
    { label: 'Principal', path: '/principaldashboard', icon: Crown },
    { label: 'Teacher', path: '/teacherdashboard', icon: GraduationCap },
    { label: 'Parent', path: '/parentdashboard', icon: Users },
    { label: 'Setup School', path: '/setupschool', icon: Building2 },
    { label: 'Join School', path: '/joinschool', icon: UserPlus },
    { label: 'Roles', path: '/roleselection', icon: RefreshCw },
  ];

  return (
    <div className="bg-slate-900 border-b border-amber-500/30 text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2 font-bold text-amber-400">
        <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>SUPER ADMIN (zerox9861@gmail.com)</span>
        <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-widest font-mono">
          Universal Access Granted
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.toLowerCase() === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
