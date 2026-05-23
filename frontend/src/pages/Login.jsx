import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { getTeacherByUserId, getSchoolByPrincipal } from '@/lib/db';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      await finishLogin(user);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  const finishLogin = async (user) => {
    if (role === 'principal') {
      navigate(createPageUrl('SetupSchool'));
    } else if (role === 'teacher') {
      navigate(createPageUrl('JoinSchool'));
    } else {
      const school = await getSchoolByPrincipal(user.uid);
      if (school) { navigate(createPageUrl('PrincipalDashboard')); return; }
      const teacher = await getTeacherByUserId(user.uid);
      if (teacher) { navigate(createPageUrl('TeacherDashboard')); return; }
      navigate(createPageUrl('RoleSelection'));
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
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Access your EduSphere portal</p>
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

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Login</span><ArrowRight className="w-4 h-4" /></>}
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
