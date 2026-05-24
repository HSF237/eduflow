import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getClasses, getDiaryByClass, addDiaryEntry, deleteDiaryEntry,
} from '@/lib/db';
import { ArrowLeft, Loader2, BookOpen, Plus, Trash2, X } from 'lucide-react';

const SUBJECTS = [
  'Math', 'English', 'Science', 'Hindi', 'Social Studies',
  'Computer', 'Art', 'PE', 'Sanskrit', 'Other',
];

export default function Diary() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: 'Math', customSubject: '', content: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth]);
  useEffect(() => { if (selectedClassId) loadEntries(selectedClassId); }, [selectedClassId]);

  const init = async () => {
    if (!authUser) { navigate('/login?role=teacher'); return; }
    const teacher = await getTeacherByUserId(authUser.uid);
    if (!teacher) { navigate(createPageUrl('JoinSchool')); return; }
    setTeacherData(teacher);
    const allClasses = await getClasses(teacher.school_id);
    const myClasses = allClasses.filter(c => c.teacher_id === teacher.id);
    setClasses(myClasses);
    if (myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    setLoading(false);
  };

  const loadEntries = async (classId) => {
    const data = await getDiaryByClass(classId);
    setEntries(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const finalSubject = form.subject === 'Other' ? form.customSubject.trim() : form.subject;
    if (!finalSubject || !form.content.trim() || !form.date) return;
    setSaving(true);
    await addDiaryEntry({
      class_id: selectedClassId,
      school_id: teacherData.school_id,
      teacher_id: teacherData.id,
      date: form.date,
      subject: finalSubject,
      content: form.content.trim(),
    });
    await loadEntries(selectedClassId);
    setForm({ subject: 'Math', customSubject: '', content: '', date: today });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diary entry?')) return;
    setDeletingId(id);
    await deleteDiaryEntry(id);
    await loadEntries(selectedClassId);
    setDeletingId(null);
  };

  const grouped = entries.reduce((acc, e) => {
    acc[e.date] = acc[e.date] || [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const SUBJECT_COLORS = {
    Math: 'bg-blue-100 text-blue-700',
    English: 'bg-green-100 text-green-700',
    Science: 'bg-purple-100 text-purple-700',
    Hindi: 'bg-orange-100 text-orange-700',
    'Social Studies': 'bg-yellow-100 text-yellow-700',
    Computer: 'bg-cyan-100 text-cyan-700',
  };
  const subjectColor = (s) => SUBJECT_COLORS[s] || 'bg-slate-100 text-slate-700';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800">Daily Diary</h1>
            {classes.length > 1 && (
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs text-slate-500 bg-transparent border-none focus:outline-none">
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={() => { setForm({ subject: 'Math', customSubject: '', content: '', date: today }); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No diary entries yet</p>
            <p className="text-slate-400 text-sm mt-1">Tap "Add" to post today's lesson</p>
          </div>
        ) : sortedDates.map(date => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {date === today ? '📅 Today' : formatDate(date)}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="space-y-2">
              {grouped[date].map(entry => (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${subjectColor(entry.subject)}`}>
                        {entry.subject}
                      </span>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{entry.content}</p>
                    </div>
                    <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      {deletingId === entry.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">Add Diary Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
                <input required type="date" value={form.date} max={today}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value, customSubject: '' }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
                {form.subject === 'Other' && (
                  <input autoFocus required value={form.customSubject}
                    onChange={e => setForm(f => ({ ...f, customSubject: e.target.value }))}
                    placeholder="Type subject name…"
                    className="w-full mt-2 border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">What was taught *</label>
                <textarea required value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="e.g. Covered Chapter 4 — Fractions. Practiced addition of unlike fractions. Students should revise examples 4.1–4.5."
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? 'Posting...' : 'Post Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
