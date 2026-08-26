import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { getSchoolById, upsertTeacher } from '@/lib/db';
import { createPageUrl } from '@/utils';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Building2,
  GraduationCap,
} from 'lucide-react';

export default function JoinTeacher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId') || searchParams.get('code') || '';

  const { loginUser } = useAuth();

  const [loadingSchool, setLoadingSchool] = useState(true);
  const [school, setSchool] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (schoolId) {
      fetchSchool(schoolId);
    } else {
      setLoadingSchool(false);
    }
  }, [schoolId]);

  const fetchSchool = async (id) => {
    try {
      const sch = await getSchoolById(id);
      if (sch) {
        setSchool(sch);
      }
    } catch (err) {
      console.warn('Error fetching school by ID:', err);
    }
    setLoadingSchool(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields (Name, Email, and Password)');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Register user locally
      const teacherUserId = 'teacher_' + Date.now();
      
      const userData = {
        id: teacherUserId,
        uid: teacherUserId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: 'TEACHER',
      };

      if (loginUser) {
        loginUser(userData, 'fake_token_for_teacher', 'fake_refresh');
      }

      const teacherData = {
        id: teacherUserId,
        user_id: teacherUserId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        school_id: schoolId || school?.id || 'demo_school',
        role: 'teacher',
        joined_at: new Date().toISOString(),
      };

      await upsertTeacher(teacherData);

      // Save local teacher session fallback if needed
      localStorage.setItem('user_role', 'teacher');
      localStorage.setItem(`teacher_user_${teacherUserId}`, JSON.stringify(teacherData));

      // 3. Immediately redirect to Teacher Dashboard
      navigate(createPageUrl('TeacherDashboard'));
    } catch (err) {
      console.error('JoinTeacher error:', err);
      setError(err.message || 'Failed to create teacher account. Please try again.');
    }
    setSubmitting(false);
  };

  if (loadingSchool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-400">Loading School Details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand / School Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Join as Teacher
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-blue-400">
            <Building2 className="w-3.5 h-3.5" />
            <span>{school?.name || 'EduSphere Academy'}</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Simplified 3-Field Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Gmail / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="teacher@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Joining School…</span>
              </>
            ) : (
              <>
                <span>Join & Open Teacher Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login?role=teacher')}
              className="text-blue-400 font-bold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
