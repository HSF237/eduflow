import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getClasses, updateClass, updateTeacher } from '@/lib/db';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Check, Users, ArrowLeft } from 'lucide-react';

export default function SelectClasses() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=teacher'); return; }

      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData?.school_id) { navigate(createPageUrl('JoinSchool')); return; }

      setTeacher(teacherData);
      setSchoolName(teacherData.schools?.name || '');

      const classData = await getClasses(teacherData.school_id);
      setClasses(classData);

      // Pre-select any classes already assigned to this teacher
      const alreadyAssigned = classData.filter(c => c.teacher_id === teacherData.id).map(c => c.id);
      setSelected(alreadyAssigned);
    } catch (err) {
      console.error('SelectClasses load error:', err);
    }
    setLoading(false);
  };

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!teacher) return;
    setSubmitting(true);
    try {
      // Update all classes: assign selected ones, remove from deselected ones
      await Promise.all(
        classes.map(cls => {
          if (selected.includes(cls.id)) {
            return updateClass(cls.id, { teacher_id: teacher.id, teacher_name: teacher.name });
          } else if (cls.teacher_id === teacher.id) {
            // Deselected — remove assignment
            return updateClass(cls.id, { teacher_id: null, teacher_name: null });
          }
          return Promise.resolve();
        })
      );
      // Store assigned_classes on the teacher doc
      await updateTeacher(teacher.id, { assigned_classes: selected });
      navigate(createPageUrl('TeacherDashboard'));
    } catch (err) {
      console.error('Error saving class selection:', err);
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
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => navigate(createPageUrl('TeacherDashboard'))}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm">
          {/* Header */}
          <div className="text-center px-8 pt-8 pb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Select Your Classes</h1>
            {schoolName && (
              <p className="text-slate-500 text-sm mt-1">{schoolName} — choose the classes you teach</p>
            )}
          </div>

          {/* Body */}
          <div className="px-8 pb-8 space-y-4">
            {classes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-500">No classes created yet</p>
                <p className="text-sm mt-1">Ask your principal to add classes first.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {classes.map((cls) => {
                    const isSelected = selected.includes(cls.id);
                    const isOtherTeacher = cls.teacher_id && cls.teacher_id !== teacher?.id;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => !isOtherTeacher && toggle(cls.id)}
                        className={`p-4 rounded-xl border-2 transition-all select-none ${
                          isOtherTeacher
                            ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-emerald-500 bg-emerald-50 cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-emerald-500' : 'bg-slate-100'
                            }`}>
                              {isSelected
                                ? <Check className="w-5 h-5 text-white" />
                                : <BookOpen className="w-5 h-5 text-slate-400" />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{cls.name}{cls.section ? ` — ${cls.section}` : ''}</p>
                              {isOtherTeacher && (
                                <p className="text-xs text-slate-400 mt-0.5">Assigned to {cls.teacher_name}</p>
                              )}
                            </div>
                          </div>
                          {!isOtherTeacher && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : selected.length === 0
                    ? 'Save (no classes selected)'
                    : `Save — ${selected.length} class${selected.length !== 1 ? 'es' : ''} selected`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
