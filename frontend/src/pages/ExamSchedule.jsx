import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  getTeacherByUserId, getClasses,
  getExamScheduleByClass, addExamScheduleEntry, deleteExamScheduleEntry,
} from '@/lib/db';
import { ArrowLeft, Loader2, CalendarDays, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function ExamSchedule() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [entries, setEntries] = useState([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', title: '', date: '', notes: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isLoadingAuth) init(authUser);
  }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (selectedClassId) loadEntries(selectedClassId);
  }, [selectedClassId]);

  const init = async (user) => {
    if (!user) { navigate('/login?role=teacher'); return; }
    try {
      const teacher = await getTeacherByUserId(user.uid);
      if (!teacher) { navigate(createPageUrl('JoinSchool')); return; }
      const all = await getClasses(teacher.school_id);
      const mine = all.filter(c => c.teacher_id === teacher.id);
      setClasses(mine);
      if (mine.length > 0) setSelectedClassId(mine[0].id);
      else setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadEntries = async (classId) => {
    setLoading(true);
    try {
      const list = await getExamScheduleByClass(classId);
      setEntries(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.subject.trim() || !form.title.trim() || !form.date) {
      setFormError('Subject, title and date are required.');
      return;
    }
    setSaving(true);
    try {
      const entry = await addExamScheduleEntry({
        class_id: selectedClassId,
        subject: form.subject.trim(),
        title: form.title.trim(),
        date: form.date,
        notes: form.notes.trim(),
      });
      setEntries(prev => [...prev, entry].sort((a, b) => a.date > b.date ? 1 : -1));
      setForm({ subject: '', title: '', date: '', notes: '' });
      setAdding(false);
      setFormError('');
    } catch {
      setFormError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteExamScheduleEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = entries.filter(e => e.date >= today);
  const past = entries.filter(e => e.date < today);

  const daysUntil = (date) => {
    const diff = new Date(date + 'T00:00:00') - new Date(today + 'T00:00:00');
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800">Exam Schedule</h1>
            <p className="text-xs text-slate-500">Post upcoming exams — parents see countdowns</p>
          </div>
          <button
            onClick={() => { setAdding(true); setFormError(''); }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exam
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Class selector */}
        {classes.length > 1 && (
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-auto"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </select>
        )}

        {/* Add form */}
        {adding && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">New Exam Entry</h2>
            {formError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Subject *</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Exam Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Unit Test 1"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  min={today}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Chapters 1–3"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAdding(false); setFormError(''); }}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Add Exam'}
              </button>
            </div>
          </div>
        )}

        {/* Upcoming exams */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm">No upcoming exams scheduled</p>
              <button onClick={() => setAdding(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">
                Add one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(e => {
                const days = daysUntil(e.date);
                return (
                  <div key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                    <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold ${
                      days === 0 ? 'bg-red-500' : days <= 3 ? 'bg-orange-500' : 'bg-indigo-500'
                    }`}>
                      <span className="text-xl leading-none">{days === 0 ? '!' : days}</span>
                      <span className="text-[10px] opacity-80 leading-none mt-0.5">{days === 0 ? 'Today' : 'days'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{e.subject}</span>
                        <span className="font-semibold text-slate-800 text-sm">{e.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      {e.notes && <p className="text-xs text-slate-400 mt-0.5">{e.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(e.id)}
                      className="shrink-0 p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past exams */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Past</h2>
            <div className="space-y-2">
              {[...past].reverse().map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 opacity-60">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-500">{e.subject}</span>
                    <span className="text-sm text-slate-600 ml-2">{e.title}</span>
                    <p className="text-xs text-slate-400">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(e.id)}
                    className="shrink-0 p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
