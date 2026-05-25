import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  getTeacherByUserId, getClasses,
  getPtmByClass, createPtmEvent, updatePtmEvent, deletePtmEvent,
} from '@/lib/db';
import { ArrowLeft, Loader2, Users, Plus, Trash2, Edit2, AlertCircle, Check, X } from 'lucide-react';

const emptyForm = { date: '', time_from: '', time_to: '', venue: '', notes: '' };

export default function PtmSchedule() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isLoadingAuth) init(authUser);
  }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (selectedClassId) loadEvents(selectedClassId);
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

  const loadEvents = async (classId) => {
    setLoading(true);
    try {
      setEvents(await getPtmByClass(classId));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev.id);
    setForm({ date: ev.date || '', time_from: ev.time_from || '', time_to: ev.time_to || '', venue: ev.venue || '', notes: ev.notes || '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.date) { setFormError('Date is required.'); return; }
    setSaving(true);
    try {
      const payload = { class_id: selectedClassId, ...form };
      if (editingId) {
        const updated = await updatePtmEvent(editingId, payload);
        setEvents(prev => prev.map(e => e.id === editingId ? updated : e));
      } else {
        const created = await createPtmEvent(payload);
        setEvents(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      setFormError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deletePtmEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
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
            <h1 className="font-bold text-slate-800">PTM Schedule</h1>
            <p className="text-xs text-slate-500">Parent-Teacher Meeting — parents see this on their dashboard</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule PTM
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Class selector */}
        {classes.length > 1 && (
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </select>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">{editingId ? 'Edit PTM' : 'Schedule PTM'}</h2>
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
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date *</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">From (time)</label>
                    <input type="time" value={form.time_from}
                      onChange={e => setForm(p => ({ ...p, time_from: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">To (time)</label>
                    <input type="time" value={form.time_to}
                      onChange={e => setForm(p => ({ ...p, time_to: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Venue</label>
                  <input type="text" value={form.venue} placeholder="e.g. Classroom 6A, School Hall"
                    onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Notes (optional)</label>
                  <textarea value={form.notes} rows={2} placeholder="Any instructions for parents..."
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming PTMs */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm">No PTM scheduled yet</p>
              <button onClick={openAdd} className="mt-3 text-rose-600 text-sm font-semibold hover:underline">
                Schedule one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-slate-800 text-base">{fmtDate(ev.date)}</p>
                      {(ev.time_from || ev.time_to) && (
                        <p className="text-sm text-rose-600 font-semibold mt-0.5">
                          {fmtTime(ev.time_from)}{ev.time_to ? ` – ${fmtTime(ev.time_to)}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {ev.venue && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold text-slate-500">Venue:</span> {ev.venue}
                    </p>
                  )}
                  {ev.notes && <p className="text-sm text-slate-500 italic">{ev.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past PTMs */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Past</h2>
            <div className="space-y-2">
              {past.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{fmtDate(ev.date)}</p>
                    {(ev.time_from || ev.time_to) && (
                      <p className="text-xs text-slate-500">{fmtTime(ev.time_from)}{ev.time_to ? ` – ${fmtTime(ev.time_to)}` : ''}</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(ev.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
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
