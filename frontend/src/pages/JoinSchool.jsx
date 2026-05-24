import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getSchoolByCode, upsertTeacher } from '@/lib/db';
import { createPageUrl } from '@/utils';
import { useNavigate, Link } from 'react-router-dom';
import { Users, KeyRound, Loader2, ArrowLeft, AlertCircle, Building2, ArrowRight, RefreshCw } from 'lucide-react';

export default function JoinSchool() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // For returning teachers
  const [existingSchoolName, setExistingSchoolName] = useState('');
  const [existingTeacher, setExistingTeacher] = useState(null);
  const [switchMode, setSwitchMode] = useState(false); // show the code input even for returning teachers

  useEffect(() => {
    if (!isLoadingAuth) checkExistingTeacher(authUser);
  }, [isLoadingAuth, authUser]);

  const checkExistingTeacher = async (user) => {
    try {
      if (!user) {
        navigate('/login?role=teacher');
        return;
      }
      const teacher = await getTeacherByUserId(user.uid);
      if (teacher?.school_id && teacher?.schools?.name) {
        setExistingTeacher(teacher);
        setExistingSchoolName(teacher.schools.name);
      }
    } catch (err) {
      console.error('JoinSchool check error:', err);
    }
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const foundSchool = await getSchoolByCode(code.toUpperCase());
      if (!foundSchool) {
        setError('Invalid school code. Please check and try again.');
        setSubmitting(false);
        return;
      }

      await upsertTeacher({
        user_id: authUser.uid,
        school_id: foundSchool.id,
        email: authUser.email,
        name: authUser.displayName || authUser.email,
      });

      navigate(createPageUrl('SelectClasses'));
    } catch (err) {
      console.error('Error joining school:', err);
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">

          {/* ── RETURNING TEACHER: already has a school ── */}
          {existingTeacher && !switchMode ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Building2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h1>
              <p className="text-slate-500 text-sm mb-6">
                You're registered as a teacher at
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6">
                <p className="text-lg font-bold text-emerald-800">{existingSchoolName}</p>
              </div>

              <button
                onClick={() => navigate(createPageUrl('TeacherDashboard'))}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSwitchMode(true)}
                className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Join a different school
              </button>
            </div>

          ) : (
            /* ── NEW TEACHER or SWITCH SCHOOL: code entry ── */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {switchMode ? 'Join a Different School' : 'Join Your School'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Enter the school code provided by your principal
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">School Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="e.g. ABC123"
                      className="w-full h-12 pl-10 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Ask your principal for the 6-character join code</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || code.length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</> : 'Join School'}
                </button>

                {switchMode && (
                  <button
                    type="button"
                    onClick={() => { setSwitchMode(false); setError(''); setCode(''); }}
                    className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
                  >
                    Cancel — keep my current school
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
