import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getStudentByParentCode } from '@/lib/db';
import { GraduationCap, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

export default function ParentLogin() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('parent_student_id')) {
      navigate(createPageUrl('ParentDashboard'));
    }
  }, []);

  // Format input as XXXX-XXXX automatically
  const handleCodeChange = (e) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
    setCode(formatted);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = code.replace('-', '');
    if (clean.length < 8) { setError('Please enter the full 8-character code.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const student = await getStudentByParentCode(code);
      if (!student) {
        setError('Invalid student code. Please check and try again.');
        setSubmitting(false);
        return;
      }

      localStorage.setItem('parent_student_id', student.id);
      localStorage.setItem('parent_student_name', student.name || '');
      localStorage.setItem('parent_class_id', student.class_id || '');
      localStorage.setItem('parent_school_id', student.school_id || '');
      navigate(createPageUrl('ParentDashboard'));
    } catch (err) {
      console.error('ParentLogin error:', err);
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex flex-col">
      <div className="p-4">
        <button
          onClick={() => navigate(createPageUrl('RoleSelection'))}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Parent Login</h1>
            <p className="text-slate-500 text-sm mt-2">
              Enter your child's unique student code to access their dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-purple-500" />
                Student Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className="w-full border border-slate-300 rounded-xl px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] uppercase placeholder:text-slate-300 placeholder:text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                Get this code from your child's school or teacher
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || code.replace('-', '').length < 8}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
