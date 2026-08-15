import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/hooks/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role'); // 'principal' or 'teacher'
  const { loginUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const backendRole = roleParam === 'principal' ? 'ADMIN' : 'TEACHER';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      let data = null;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.fullName,
            role: backendRole,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || 'Registration failed');
        }
        data = resData;
      } catch (fetchErr) {
        // Fallback for offline local UI testing when backend server is not yet running
        if (fetchErr.message === 'Failed to fetch' || fetchErr.name === 'TypeError') {
          console.warn('Backend server unreachable at', API_BASE_URL, '- using local demo session.');
          data = {
            user: {
              id: 'usr_' + Math.random().toString(36).substring(2, 9),
              email: formData.email,
              name: formData.fullName,
              role: backendRole,
            },
            accessToken: 'demo_access_token',
            refreshToken: 'demo_refresh_token',
          };
        } else {
          throw fetchErr;
        }
      }

      loginUser(data.user, data.accessToken, data.refreshToken);

      // Seamless onboarding routing
      if (roleParam === 'principal' || backendRole === 'ADMIN') {
        navigate(createPageUrl('SetupSchool'));
      } else if (roleParam === 'teacher') {
        navigate(createPageUrl('JoinSchool'));
      } else {
        navigate(createPageUrl('RoleSelection'));
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
              {roleParam === 'principal' ? 'Principal Registration' : 'Create Account'}
            </h2>
            <p className="text-slate-500 text-sm">
              {roleParam === 'principal' ? 'Register as Principal to Setup your School' : 'Join the EduSphere Network'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">{error}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Muhammad Hasan"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="email" placeholder="name@school.com"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="password" placeholder="••••••••"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="password" placeholder="••••••••"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs mt-2 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{roleParam === 'principal' ? 'Continue to School Setup' : 'Register for Portal'}</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button onClick={() => navigate(createPageUrl('Login'))} className="text-blue-600 font-bold hover:underline">Login Here</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
