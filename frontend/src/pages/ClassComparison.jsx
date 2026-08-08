import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal, getClasses, getStudentsByClass,
  getAttendanceByClassInYear, getExamsByClass, getMarksByExams,
  getAcademicYearDates,
} from '@/lib/db';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Loader2, BarChart2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-bold text-slate-500">#{rank}</span>;
}

function Bar({ pct, color }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function ClassComparison() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Loading classes...');
  const [rows, setRows] = useState([]);
  const [sortKey, setSortKey] = useState('rank');

  useEffect(() => {
    if (!isLoadingAuth) load(authUser);
  }, [isLoadingAuth, authUser]);

  const load = async (user) => {
    if (!user) { navigate('/login?role=principal'); return; }
    try {
      const sch = await getSchoolByPrincipal(user.uid);
      if (!sch) { navigate(createPageUrl('SetupSchool')); return; }

      const classes = await getClasses(sch.id);
      if (classes.length === 0) { setLoading(false); return; }

      const { startStr, endStr } = getAcademicYearDates();

      const classData = await Promise.all(classes.map(async (cls, i) => {
        setProgress(`Analyzing ${cls.name} (${i + 1}/${classes.length})...`);
        const [students, att, exams] = await Promise.all([
          getStudentsByClass(cls.id),
          getAttendanceByClassInYear(cls.id, startStr, endStr),
          getExamsByClass(cls.id),
        ]);

        const totalStudents = students.length;

        let attPct = 0;
        if (att.length > 0) {
          const present = att.filter(a => a.status === 'present' || a.status === 'late').length;
          attPct = Math.round((present / att.length) * 100);
        }

        let marksPct = 0;
        if (exams.length > 0 && totalStudents > 0) {
          const examIds = exams.map(e => e.id);
          const marks = await getMarksByExams(examIds);
          let totalScored = 0;
          let totalPossible = 0;
          marks.forEach(m => {
            if (m.marks_obtained !== null && m.marks_obtained !== undefined) {
              const exam = exams.find(e => e.id === m.exam_id);
              const max = exam?.max_marks || 100;
              totalScored += Number(m.marks_obtained);
              totalPossible += max;
            }
          });
          if (totalPossible > 0) {
            marksPct = Math.round((totalScored / totalPossible) * 100);
          }
        }

        const score = Math.round(attPct * 0.4 + marksPct * 0.6);

        return {
          id: cls.id,
          name: cls.name,
          section: cls.section,
          totalStudents,
          attPct,
          marksPct,
          score,
        };
      }));

      classData.sort((a, b) => b.score - a.score);
      const ranked = classData.map((c, idx) => ({ ...c, rank: idx + 1 }));
      setRows(ranked);
    } catch (err) {
      console.error('ClassComparison error:', err);
    }
    setLoading(false);
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    if (sortKey === 'attPct') return b.attPct - a.attPct;
    if (sortKey === 'marksPct') return b.marksPct - a.marksPct;
    if (sortKey === 'students') return b.totalStudents - a.totalStudents;
    return a.rank - b.rank;
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-500">{progress}</p>
    </div>
  );

  return (
    <AppLayout title="Class Comparison">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-slate-800">Class Comparison</h1>
              <p className="text-xs text-slate-500">All classes ranked by performance this academic year</p>
            </div>
            <BarChart2 className="w-5 h-5 text-blue-500" />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sort By:</span>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white">
              <option value="rank">Overall Rank</option>
              <option value="attPct">Attendance Rate</option>
              <option value="marksPct">Academic Score</option>
              <option value="name">Class Name</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center">Rank</th>
                    <th className="p-3">Class</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3">Attendance %</th>
                    <th className="p-3">Academic %</th>
                    <th className="p-3 text-right">Composite Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center">
                        <RankBadge rank={row.rank} />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {row.name} {row.section && <span className="text-slate-400 font-normal">({row.section})</span>}
                      </td>
                      <td className="p-3 text-center text-slate-600">{row.totalStudents}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700">{row.attPct}%</span>
                          <Bar pct={row.attPct} color="bg-emerald-500" />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700">{row.marksPct}%</span>
                          <Bar pct={row.marksPct} color="bg-blue-500" />
                        </div>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                        {row.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
