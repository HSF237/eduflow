import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getStudentByParentCode } from '@/lib/db';
import { GraduationCap, ArrowLeft, Loader2, KeyRound, CheckCircle2, Plus, Users } from 'lucide-react';

const formatCode = (raw) => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
};

const saveToStorage = (students) => {
  // students = [{id, name, class_id, school_id}]
  const first = students[0];
  localStorage.setItem('parent_student_id', first.id);
  localStorage.setItem('parent_student_name', first.name);
  localStorage.setItem('parent_class_id', first.class_id);
  localStorage.setItem('parent_school_id', first.school_id);
  localStorage.setItem('parent_linked_students', JSON.stringify(students));
};

export default function ParentLogin() {
  const navigate = useNavigate();

  // phase: 'first' | 'sibling_prompt' | 'sibling_codes'
  const [phase, setPhase] = useState('first');
  const [firstCode, setFirstCode] = useState('');
  const [firstStudent, setFirstStudent] = useState(null);
  const [firstError, setFirstError] = useState('');
  const [firstLoading, setFirstLoading] = useState(false);

  const [siblingCodes, setSiblingCodes] = useState(['']);
  const [siblingErrors, setSiblingErrors] = useState(['']);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('parent_student_id')) {
      navigate(createPageUrl('ParentDashboard'));
    }
  }, []);

  // ── Phase 1: verify first child ─────────────────────────────────────────────
  const handleFirstSubmit = async (e) => {
    e.preventDefault();
    if (firstCode.replace('-', '').length < 8) {
      setFirstError('Please enter the full 8-character code.');
      return;
    }
    setFirstLoading(true);
    setFirstError('');
    try {
      const student = await getStudentByParentCode(firstCode);
      if (!student) {
        setFirstError('Invalid code. Please check and try again.');
        setFirstLoading(false);
        return;
      }
      setFirstStudent({ id: student.id, name: student.name || '', class_id: student.class_id || '', school_id: student.school_id || '' });
      setPhase('sibling_prompt');
    } catch {
      setFirstError('Something went wrong. Please try again.');
    }
    setFirstLoading(false);
  };

  // ── No siblings — save first child and go ──────────────────────────────────
  const handleNoSiblings = () => {
    saveToStorage([firstStudent]);
    navigate(createPageUrl('ParentDashboard'));
  };

  // ── Sibling code input helpers ──────────────────────────────────────────────
  const updateSiblingCode = (idx, val) => {
    setSiblingCodes(prev => prev.map((c, i) => i === idx ? formatCode(val) : c));
    setSiblingErrors(prev => prev.map((e, i) => i === idx ? '' : e));
  };

  const addSiblingSlot = () => {
    if (siblingCodes.length >= 5) return;
    setSiblingCodes(prev => [...prev, '']);
    setSiblingErrors(prev => [...prev, '']);
  };

  // ── Phase 3: verify siblings and finish ─────────────────────────────────────
  const handleFinish = async () => {
    const filledCodes = siblingCodes.filter(c => c.replace('-', '').length === 8);
    if (filledCodes.length === 0) {
      // No sibling codes filled — just go with first child
      saveToStorage([firstStudent]);
      navigate(createPageUrl('ParentDashboard'));
      return;
    }

    setFinalizing(true);
    const newErrors = siblingCodes.map(() => '');
    const linkedStudents = [firstStudent];

    await Promise.all(siblingCodes.map(async (code, idx) => {
      if (code.replace('-', '').length < 8) return;
      try {
        const student = await getStudentByParentCode(code);
        if (!student) {
          newErrors[idx] = 'Invalid code';
        } else if (student.id === firstStudent.id) {
          newErrors[idx] = 'Same as first child';
        } else if (linkedStudents.find(s => s.id === student.id)) {
          newErrors[idx] = 'Already added';
        } else {
          linkedStudents.push({ id: student.id, name: student.name || '', class_id: student.class_id || '', school_id: student.school_id || '' });
        }
      } catch {
        newErrors[idx] = 'Error verifying code';
      }
    }));

    setSiblingErrors(newErrors);
    const hasErrors = newErrors.some(e => e !== '');
    setFinalizing(false);

    if (!hasErrors) {
      saveToStorage(linkedStudents);
      navigate(createPageUrl('ParentDashboard'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex flex-col">
      <div className="p-4">
        <button
          onClick={() => phase !== 'first' ? setPhase('first') : navigate(createPageUrl('RoleSelection'))}
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

          {/* ── Phase 1: Enter first child code ── */}
          {phase === 'first' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Parent Login</h1>
                <p className="text-slate-500 text-sm mt-2">
                  Enter your child's unique student code to access their dashboard.
                </p>
              </div>

              {firstError && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                  {firstError}
                </div>
              )}

              <form onSubmit={handleFirstSubmit} className="space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                    <KeyRound className="w-4 h-4 text-purple-500" />
                    Student Code
                  </label>
                  <input
                    type="text"
                    value={firstCode}
                    onChange={e => { setFirstCode(formatCode(e.target.value)); setFirstError(''); }}
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
                  disabled={firstLoading || firstCode.replace('-', '').length < 8}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
                >
                  {firstLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Access Dashboard'}
                </button>
              </form>
            </>
          )}

          {/* ── Phase 2: Sibling prompt ── */}
          {phase === 'sibling_prompt' && firstStudent && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  {firstStudent.name} — Verified
                </div>
                <h1 className="text-xl font-bold text-slate-900">Any siblings?</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Does <strong>{firstStudent.name}</strong> have brothers or sisters in this school?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setPhase('sibling_codes')}
                  className="w-full flex items-center justify-center gap-2 border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-3.5 rounded-xl transition-colors"
                >
                  <Users className="w-5 h-5" />
                  Yes, add siblings
                </button>
                <button
                  onClick={handleNoSiblings}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-3.5 rounded-xl transition-colors"
                >
                  No, go to dashboard
                </button>
              </div>
            </>
          )}

          {/* ── Phase 3: Enter sibling codes ── */}
          {phase === 'sibling_codes' && firstStudent && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {firstStudent.name} — Verified
                </div>
                <h1 className="text-xl font-bold text-slate-900">Add siblings</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Enter each sibling's student code (up to 5).
                </p>
              </div>

              <div className="space-y-3 mb-4">
                {siblingCodes.map((c, idx) => (
                  <div key={idx}>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">
                      Sibling {idx + 1} Code
                    </label>
                    <input
                      type="text"
                      value={c}
                      onChange={e => updateSiblingCode(idx, e.target.value)}
                      placeholder="XXXX-XXXX"
                      autoComplete="off"
                      spellCheck={false}
                      className={`w-full border rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.3em] uppercase placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        siblingErrors[idx] ? 'border-red-400 bg-red-50' : 'border-slate-300'
                      }`}
                    />
                    {siblingErrors[idx] && (
                      <p className="text-xs text-red-600 mt-1">{siblingErrors[idx]}</p>
                    )}
                  </div>
                ))}

                {siblingCodes.length < 5 && (
                  <button
                    type="button"
                    onClick={addSiblingSlot}
                    className="flex items-center gap-1.5 text-purple-600 text-sm font-semibold hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add another sibling
                  </button>
                )}
              </div>

              <button
                onClick={handleFinish}
                disabled={finalizing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {finalizing ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Continue to Dashboard'}
              </button>
              <button
                onClick={handleNoSiblings}
                className="w-full mt-2 text-slate-500 text-sm hover:underline"
              >
                Skip — go with just {firstStudent.name}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
