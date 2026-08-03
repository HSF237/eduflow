import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

import PrincipalDashboard from './PrincipalDashboard';
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';
import { Shield, GraduationCap, Users } from 'lucide-react';

export default function DashboardRouter({ session }) {
  const [profile, setProfile] = useState({
    id: "mock-123",
    role: "PRINCIPAL",
    name: "Admin User",
    schoolName: "EduSphere Academy"
  });
  const [loading, setLoading] = useState(false);

  // Function to manually switch roles during testing
  const switchRole = (newRole) => {
    setLoading(true);
    setTimeout(() => {
        setProfile({...profile, role: newRole});
        setLoading(false);
    }, 400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <Routes>
        <Route path="/" element={
            profile.role === 'PRINCIPAL' ? <Navigate to="/dashboard/principal" replace /> :
            profile.role === 'TEACHER' ? <Navigate to="/dashboard/teacher" replace /> :
            <Navigate to="/dashboard/parent" replace />
        } />
        <Route path="/principal/*" element={<PrincipalDashboard profile={profile} />} />
        <Route path="/teacher/*" element={<TeacherDashboard profile={profile} />} />
        <Route path="/parent/*" element={<ParentDashboard profile={profile} />} />
      </Routes>

      {/* FLOATING ROLE SWITCHER - ONLY FOR TESTING */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 glass-panel bg-white/5 border-pink-500/20 backdrop-blur-2xl shadow-2xl shadow-pink-500/10">
          <div className="px-3 py-1 text-[9px] font-black text-pink-500 uppercase tracking-widest border-r border-white/10 mr-1">Switch View:</div>
          <button onClick={() => switchRole('PRINCIPAL')} className={`p-2 rounded-xl transition-all ${profile.role === 'PRINCIPAL' ? 'bg-pink-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
            <Shield size={18} />
          </button>
          <button onClick={() => switchRole('TEACHER')} className={`p-2 rounded-xl transition-all ${profile.role === 'TEACHER' ? 'bg-pink-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
            <GraduationCap size={18} />
          </button>
          <button onClick={() => switchRole('PARENT')} className={`p-2 rounded-xl transition-all ${profile.role === 'PARENT' ? 'bg-pink-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
            <Users size={18} />
          </button>
      </div>
    </div>
  );
}
