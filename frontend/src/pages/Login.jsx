import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const { loginUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const routeAfterLogin = (user) => {
    if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
      navigate(createPageUrl('PrincipalDashboard'));
      return;
    }
    if (user.role === 'TEACHER') {
      navigate(createPageUrl('TeacherDashboard'));
      return;
    }
    if (user.role === 'PARENT') {
      navigate(createPageUrl('ParentDashboard'));
      return;
    }

    if (role === 'principal') { navigate(createPageUrl('SetupSchool')); return; }
    if (role === 'teacher')   { navigate(createPageUrl('JoinSchool'));  return; }
    navigate(createPageUrl('RoleSelection'));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }

      loginUser(data.user, data.accessToken, data.refreshToken);
      routeAfterLogin(data.user);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
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
            <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Access your self-hosted EduFlow portal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@school.com"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-md"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button onClick={() => navigate(createPageUrl('Register'))} className="text-blue-600 font-bold hover:underline">Sign Up</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
