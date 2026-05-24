import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getClasses,
  getAnnouncementsByClass, addAnnouncement, deleteAnnouncement,
} from '@/lib/db';
import { ArrowLeft, Loader2, Megaphone, Plus, Trash2, X } from 'lucide-react';

export default function Announcements() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth, authUser]);
  useEffect(() => { if (selectedClassId) loadItems(selectedClassId); }, [selectedClassId]);

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

  const loadItems = async (classId) => {
    const data = await getAnnouncementsByClass(classId);
    setItems(data);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await addAnnouncement({
      class_id: selectedClassId,
      school_id: teacherData.school_id,
      teacher_id: teacherData.id,
      teacher_name: teacherData.name,
      title: form.title.trim(),
      body: form.body.trim(),
    });
    await loadItems(selectedClassId);
    setForm({ title: '', body: '' });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingId(id);
    await deleteAnnouncement(id);
    await loadItems(selectedClassId);
    setDeletingId(null);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const ms = ts.toMillis?.() ?? (ts.seconds ? ts.seconds * 1000 : 0);
    if (!ms) return '';
    const date = new Date(ms);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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
            <h1 className="font-bold text-slate-800">Announcements</h1>
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
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No announcements yet</p>
            <p className="text-slate-400 text-sm mt-1">Tap "Post" to broadcast a message to all parents</p>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <p className="font-semibold text-slate-800">{item.title}</p>
                </div>
                {item.body && <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>}
                <p className="text-xs text-slate-400 mt-2">{formatTime(item.created_at)}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                {deletingId === item.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handlePost} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Title *</label>
                <input required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. School closed on Monday"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Message (optional)</label>
                <textarea value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
              <p className="text-xs text-slate-400">
                This will be visible to all parents in the selected class.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? 'Posting…' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
