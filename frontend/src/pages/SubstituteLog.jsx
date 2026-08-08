import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal, getClasses, getTeachers,
  createSubstituteEntry, getSubstitutesBySchool, deleteSubstituteEntry,
} from '@/lib/db';
import {
  ArrowLeft, Loader2, Plus, Trash2, Calendar, UserCheck,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

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

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=principal'); return; }
      const sch = await getSchoolByPrincipal(user.uid);
      setSchool(sch);
      if (sch) {
        const [tch, cls, subLogs] = await Promise.all([
          getTeachers(sch.id),
          getClasses(sch.id),
          getSubstitutesBySchool(sch.id),
        ]);
        setTeachers(tch);
        setClasses(cls);
        setLogs(subLogs);
      }
    } catch (err) {
      console.error('SubstituteLog load error:', err);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        school_id: school.id,
        date: selectedDate,
      };
      await createSubstituteEntry(payload);
      const updatedLogs = await getSubstitutesBySchool(school.id);
      setLogs(updatedLogs);
      setShowForm(false);
      setForm(emptyForm);
    } catch (err) {
      console.error('Error creating substitute entry:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this substitute log entry?')) return;
    try {
      await deleteSubstituteEntry(id);
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error deleting substitute log:', err);
    }
  };

  const filteredLogs = logs.filter(l => l.date === selectedDate);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <AppLayout title="Substitute Log">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-slate-800">Substitute Log</h1>
              <p className="text-xs text-slate-500">Track teacher absences and substitutes</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredLogs.length} entry{filteredLogs.length !== 1 ? 'ies' : ''} on this date
            </span>
          </div>

          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No substitutes recorded for this date</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Absent Teacher: <span className="text-red-600">{log.absent_teacher_name || 'Teacher'}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Substitute: <span className="text-green-600 font-semibold">{log.substitute_name || 'Substitute'}</span>
                    </p>
                    {log.class_name && (<p className="text-[11px] text-slate-400">Class: {log.class_name} | Period: {log.period || 'Full Day'}</p>)}
                  </div>
                  <button onClick={() => handleDelete(log.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </main>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-slate-800">New Substitute Entry</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Absent Teacher *</label>
                  <select required value={form.absent_teacher_id} onChange={e => {
                    const t = teachers.find(tch => tch.id === e.target.value);
                    setForm(f => ({ ...f, absent_teacher_id: e.target.value, absent_teacher_name: t?.name || '' }));
                  }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                    <option value="">Select teacher...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Class *</label>
                  <select required value={form.class_id} onChange={e => {
                    const c = classes.find(cls => cls.id === e.target.value);
                    setForm(f => ({ ...f, class_id: e.target.value, class_name: c?.name || '' }));
                  }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                    <option value="">Select class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Substitute Teacher *</label>
                  <select required value={form.substitute_teacher_id} onChange={e => {
                    const t = teachers.find(tch => tch.id === e.target.value);
                    setForm(f => ({ ...f, substitute_teacher_id: e.target.value, substitute_name: t?.name || '' }));
                  }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                    <option value="">Select substitute teacher...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-xs py-2 rounded-lg font-semibold">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-orange-600 text-white text-xs py-2 rounded-lg font-semibold disabled:opacity-60">
                    {saving ? 'Saving...' : 'Add Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
