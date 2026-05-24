import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getClasses, getHomeworkByClass, addHomework, deleteHomework,
  getFcmTokensForClass,
} from '@/lib/db';
import { sendPush } from '@/lib/fcm';
import { ArrowLeft, Loader2, BookOpen, Plus, Trash2, X } from 'lucide-react';

const SUBJECTS = [
  'Math', 'English', 'Science', 'Hindi', 'Social Studies',
  'Computer', 'Art', 'PE', 'Sanskrit', 'Other',
];

export default function Homework() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [homework, setHomework] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: 'Math', customSubject: '', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth, authUser]);
  useEffect(() => { if (selectedClassId) loadHw(selectedClassId); }, [selectedClassId]);

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

  const loadHw = async (classId) => {
    const hw = await getHomeworkByClass(classId);
    setHomework(hw);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.due_date) return;
    const finalSubject = form.subject === 'Other' ? form.customSubject.trim() : form.subject;
    if (!finalSubject) return;
    setSaving(true);
    await addHomework({
      class_id: selectedClassId,
      school_id: teacherData.school_id,
      teacher_id: teacherData.id,
      title: form.title,
      subject: finalSubject,
      description: form.description,
      due_date: form.due_date,
    });
    await loadHw(selectedClassId);
    setForm({ title: '', subject: 'Math', customSubject: '', description: '', due_date: '' });
    setShowForm(false);
    setSaving(false);
    // Push notification — fire and forget
    getFcmTokensForClass(selectedClassId).then(tokens =>
      sendPush(tokens, '📚 New Homework', `${finalSubject}: ${form.title}`)
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this homework?')) return;
    setDeletingId(id);
    await deleteHomework(id);
    await loadHw(selectedClassId);
    setDeletingId(null);
  };

  const getDueStatus = (dueDate) => {
    if (dueDate < today) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
    if (dueDate === today) return { label: 'Due Today', cls: 'bg-orange-100 text-orange-700' };
    return {
      label: `Due ${new Date(dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      cls: 'bg-blue-100 text-blue-700',
    };
  };

  const sorted = [...homework].sort((a, b) => (a.due_date > b.due_date ? 1 : -1));

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
            <h1 className="font-bold text-slate-800">Homework</h1>
            {classes.length > 1 && (
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs text-slate-500 bg-transparent border-none focus:outline-none">
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No homework posted yet</p>
            <p className="text-slate-400 text-sm mt-1">Tap "Add" to post the first assignment</p>
          </div>
        ) : sorted.map(hw => {
          const due = getDueStatus(hw.due_date);
          return (
            <div key={hw.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {hw.subject}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${due.cls}`}>
                      {due.label}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800">{hw.title}</p>
                  {hw.description && (
                    <p className="text-sm text-slate-500 mt-1">{hw.description}</p>
                  )}
                </div>
                <button onClick={() => handleDelete(hw.id)} disabled={deletingId === hw.id}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                  {deletingId === hw.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">Add Homework</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value, customSubject: '' }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
                {form.subject === 'Other' && (
                  <input
                    required
                    autoFocus
                    value={form.customSubject}
                    onChange={e => setForm(f => ({ ...f, customSubject: e.target.value }))}
                    placeholder="Type subject name…"
                    className="w-full mt-2 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Title *</label>
                <input required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chapter 3 exercises (Q1–Q10)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Instructions (optional)</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Additional instructions..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Due Date *</label>
                <input required type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  min={today}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? 'Posting...' : 'Post Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
