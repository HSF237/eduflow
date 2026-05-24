import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import { getTeacherByUserId, getClasses, getTimetable, saveTimetable } from '@/lib/db';
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_PERIODS = 8;

const emptySchedule = (count = DEFAULT_PERIODS) => {
  const s = {};
  DAYS.forEach(d => { s[d] = Array(count).fill(''); });
  return s;
};

export default function Timetable() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [periodCount, setPeriodCount] = useState(DEFAULT_PERIODS);
  const [schedule, setSchedule] = useState(emptySchedule());

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth, authUser]);
  useEffect(() => { if (selectedClassId) loadTt(selectedClassId); }, [selectedClassId]);

  const init = async () => {
    if (!authUser) { navigate('/login?role=teacher'); return; }
    const teacher = await getTeacherByUserId(authUser.uid);
    if (!teacher) { navigate(createPageUrl('JoinSchool')); return; }
    const allClasses = await getClasses(teacher.school_id);
    const myClasses = allClasses.filter(c => c.teacher_id === teacher.id);
    setClasses(myClasses);
    if (myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    setLoading(false);
  };

  const loadTt = async (classId) => {
    const tt = await getTimetable(classId);
    if (tt) {
      const pc = tt.period_count || DEFAULT_PERIODS;
      setPeriodCount(pc);
      const s = emptySchedule(pc);
      DAYS.forEach(d => { if (Array.isArray(tt[d])) s[d] = [...tt[d]]; });
      setSchedule(s);
    } else {
      setPeriodCount(DEFAULT_PERIODS);
      setSchedule(emptySchedule());
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setSaved(false);
  };

  const handlePeriodCountChange = (n) => {
    setPeriodCount(n);
    setSchedule(prev => {
      const next = {};
      DAYS.forEach(d => {
        const existing = prev[d] || [];
        next[d] = Array(n).fill('').map((_, i) => existing[i] || '');
      });
      return next;
    });
  };

  const handleCell = (day, periodIndex, value) => {
    setSchedule(prev => {
      const next = { ...prev, [day]: [...prev[day]] };
      next[day][periodIndex] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveTimetable(selectedClassId, { ...schedule, period_count: periodCount });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800">Timetable</h1>
            {classes.length > 1 && (
              <select value={selectedClassId} onChange={e => handleClassChange(e.target.value)}
                className="text-xs text-slate-500 bg-transparent border-none focus:outline-none">
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-slate-500 hidden sm:block">Periods:</label>
            <select value={periodCount} onChange={e => handlePeriodCountChange(Number(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              {[5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${saved ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-center text-xs font-bold text-slate-400 border-b border-slate-200 w-12">#</th>
                {DAYS.map(d => (
                  <th key={d} className="p-3 text-center text-xs font-bold text-slate-600 border-b border-slate-200">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodCount }, (_, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/30 transition-colors">
                  <td className="p-2 text-center">
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center mx-auto">
                      {i + 1}
                    </span>
                  </td>
                  {DAYS.map(d => (
                    <td key={d} className="p-2">
                      <input
                        value={schedule[d]?.[i] || ''}
                        onChange={e => handleCell(d, i, e.target.value)}
                        placeholder="—"
                        className="w-full text-center text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white placeholder:text-slate-300 transition-colors"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 text-center mt-4">
          Fill in subject names for each period. Click Save when done.
        </p>
      </main>
    </div>
  );
}
