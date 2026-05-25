import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal, getClasses, getTeachers,
  createSubstituteEntry, getSubstitutesBySchool, deleteSubstituteEntry,
} from '@/lib/db';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Loader2, Plus, Trash2, AlertCircle, X, Check,
  UserX, UserCheck, Calendar,
} from 'lucide-react';

const emptyForm = {
  absent_teacher_id: '',
  absent_teacher_name: '',
  class_id: '',
  class_name: '',
  substitute_teacher_id: '',
  substitute_name: '',
  period: '',
  notes: '',
};

export default function SubstituteLog() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [customSub, setCustomSub] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth) init(authUser);
  }, [isLoadingAuth, authUser]);

  const init = async (user) => {
    if (!user) { navigate('/login?role=principal'); return; }
    try {
      const sc = await getSchoolByPrincipal(user.uid);
      if (!sc) { navigate(createPageUrl('SetupSchool')); return; }
      setSchool(sc);
      const [cls, tea, allLogs] = await Promise.all([
        getClasses(sc.id),
        getTeachers(sc.id),
        getSubstitutesBySchool(sc.id),
      ]);
      setClasses(cls);
      setTeachers(tea);
      setLogs(allLogs);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openForm = () => {
    setForm(emptyForm);
    setFormError('');
    setCustomSub(false);
    setShowForm(true);
  };

  const handleAbsentTeacherChange = (teacherId) => {
    const t = teachers.find(t => t.id === teacherId);
    // Auto-select teacher's class if they have one
    const cls = teacherId ? classes.find(c => c.teacher_id === teacherId) : null;
    setForm(p => ({
      ...p,
      absent_teacher_id: teacherId,
      absent_teacher_name: t?.name || '',
      class_id: cls?.id || p.class_id,
      class_name: cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : p.class_name,
    }));
  };

  const handleSubTeacherChange = (teacherId) => {
    if (teacherId === '__custom__') {
      setCustomSub(true);
      setForm(p => ({ ...p, substitute_teacher_id: '', substitute_name: '' }));
    } else {
      setCustomSub(false);
      const t = teachers.find(t => t.id === teacherId);
      setForm(p => ({ ...p, substitute_teacher_id: teacherId, substitute_name: t?.name || '' }));
    }
  };

  const handleClassChange = (classId) => {
    const cls = classes.find(c => c.id === classId);
    setForm(p => ({
      ...p,
      class_id: classId,
      class_name: cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : '',
    }));
  };

  const handleSave = async () => {
    if (!form.absent_teacher_name.trim()) { setFormError('Select the absent teacher.'); return; }
    if (!form.substitute_name.trim()) { setFormError('Enter the substitute teacher name.'); return; }
    setSaving(true);
    try {
      const entry = await createSubstituteEntry({
        school_id: school.id,
        date: selectedDate,
        absent_teacher_id: form.absent_teacher_id || null,
        absent_teacher_name: form.absent_teacher_name.trim(),
        class_id: form.class_id || null,
        class_name: form.class_name.trim(),
        substitute_teacher_id: form.substitute_teacher_id || null,
        substitute_name: form.substitute_name.trim(),
        period: form.period.trim(),
        notes: form.notes.trim(),
      });
      setLogs(prev => [entry, ...prev]);
      setShowForm(false);
    } catch {
      setFormError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteSubstituteEntry(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const todayLogs = logs.filter(l => l.date === selectedDate);
  const groupedByDate = logs.reduce((acc, l) => {
    if (!acc[l.date]) acc[l.date] = [];
    acc[l.date].push(l);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b > a ? 1 : -1);

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800">Substitute Log</h1>
            <p className="text-xs text-slate-500">Track teacher absences and substitutes</p>
          </div>
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Date picker + today summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <span className="text-sm text-slate-500">
            {todayLogs.length === 0
              ? 'No substitutes for this date'
              : `${todayLogs.length} substitute${todayLogs.length > 1 ? 's' : ''} on this date`}
          </span>
        </div>

        {/* Entries for selected date */}
        {todayLogs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{fmtDate(selectedDate)}</h2>
            {todayLogs.map(log => (
              <LogCard key={log.id} log={log} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {todayLogs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-12">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">All teachers present on this date</p>
            <button onClick={openForm} className="mt-3 text-orange-600 text-sm font-semibold hover:underline">
              Add substitute entry
            </button>
          </div>
        )}

        {/* History — all other dates */}
        {sortedDates.filter(d => d !== selectedDate).length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">History</h2>
            <div className="space-y-5">
              {sortedDates.filter(d => d !== selectedDate).map(date => (
                <div key={date}>
                  <p className="text-sm font-semibold text-slate-600 mb-2">{fmtDate(date)}</p>
                  <div className="space-y-2">
                    {groupedByDate[date].map(log => (
                      <LogCard key={log.id} log={log} onDelete={handleDelete} muted />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Add Substitute Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="space-y-3">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
                <input type="date" value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Absent teacher */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  <UserX className="w-3.5 h-3.5 inline mr-1 text-red-400" />
                  Absent Teacher *
                </label>
                <select
                  value={form.absent_teacher_id}
                  onChange={e => handleAbsentTeacherChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Class Affected</label>
                <select
                  value={form.class_id}
                  onChange={e => handleClassChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select class (optional)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Substitute */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  <UserCheck className="w-3.5 h-3.5 inline mr-1 text-green-500" />
                  Substitute Teacher *
                </label>
                {!customSub ? (
                  <select
                    value={form.substitute_teacher_id}
                    onChange={e => handleSubTeacherChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Select from staff</option>
                    {teachers
                      .filter(t => t.id !== form.absent_teacher_id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    <option value="__custom__">+ Enter custom name</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.substitute_name}
                      onChange={e => setForm(p => ({ ...p, substitute_name: e.target.value }))}
                      placeholder="Substitute name"
                      autoFocus
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button onClick={() => { setCustomSub(false); setForm(p => ({ ...p, substitute_name: '', substitute_teacher_id: '' })); }}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-500 hover:bg-slate-50">
                      List
                    </button>
                  </div>
                )}
              </div>

              {/* Period */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Period / Time (optional)</label>
                <input type="text" value={form.period}
                  onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                  placeholder="e.g. Period 3, 10:00–10:45"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Notes (optional)</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional instructions..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogCard({ log, onDelete, muted = false }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${
      muted ? 'border-slate-100 opacity-75' : 'border-slate-200'
    }`}>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <UserX className="w-5 h-5 text-red-500" />
        </div>
        <div className="w-0.5 h-4 bg-slate-200 rounded" />
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-green-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">Absent</p>
              <p className="font-bold text-slate-800">{log.absent_teacher_name}</p>
              {log.class_name && (
                <p className="text-xs text-slate-500">Class: {log.class_name}</p>
              )}
              {log.period && (
                <p className="text-xs text-slate-500">Period: {log.period}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Substitute</p>
              <p className="font-bold text-slate-800">{log.substitute_name}</p>
            </div>
            {log.notes && (
              <p className="text-xs text-slate-400 italic">{log.notes}</p>
            )}
          </div>
          <button onClick={() => onDelete(log.id)}
            className="shrink-0 p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
