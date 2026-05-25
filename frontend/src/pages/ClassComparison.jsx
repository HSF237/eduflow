import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal, getClasses, getStudentsByClass,
  getAttendanceByClassInYear, getExamsByClass, getMarksByExams,
  getAcademicYearDates,
} from '@/lib/db';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Loader2, Award, AlertTriangle, Users, TrendingUp, BarChart2 } from 'lucide-react';

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
      const school = await getSchoolByPrincipal(user.uid);
      if (!school) { navigate(createPageUrl('SetupSchool')); return; }

      const { start, end } = getAcademicYearDates(school);
      setProgress('Loading classes...');
      const classes = await getClasses(school.id);

      setProgress(`Computing stats for ${classes.length} classes...`);
      const classStats = await Promise.all(classes.map(async (cls) => {
        try {
          const [students, attendance, exams] = await Promise.all([
            getStudentsByClass(cls.id),
            getAttendanceByClassInYear(cls.id, start, end),
            getExamsByClass(cls.id),
          ]);

          // Attendance %
          let attSum = 0, attCount = 0;
          students.forEach(s => {
            const recs = attendance.filter(r => r.student_id === s.id);
            if (recs.length > 0) {
              const present = recs.filter(r => ['present', 'Present', 'late', 'Late'].includes(r.status)).length;
              attSum += (present / recs.length) * 100;
              attCount++;
            }
          });
          const avgAtt = attCount > 0 ? Math.round(attSum / attCount) : null;

          // At-risk: < 75% attendance
          const atRisk = students.filter(s => {
            const recs = attendance.filter(r => r.student_id === s.id);
            if (!recs.length) return false;
            const present = recs.filter(r => ['present', 'Present', 'late', 'Late'].includes(r.status)).length;
            return (present / recs.length) * 100 < 75;
          }).length;

          // Avg marks %
          let avgMarks = null;
          if (exams.length > 0) {
            const examIds = exams.map(e => e.id);
            const allMarks = await getMarksByExams(examIds);
            let totalObt = 0, totalMax = 0;
            students.forEach(s => {
              exams.forEach(exam => {
                const m = allMarks.find(mk => mk.exam_id === exam.id && mk.student_id === s.id);
                if (m) { totalObt += Number(m.marks_obtained); totalMax += Number(exam.max_marks) || 100; }
              });
            });
            if (totalMax > 0) avgMarks = Math.round((totalObt / totalMax) * 100);
          }

          return {
            id: cls.id,
            name: cls.name,
            section: cls.section || '',
            studentCount: students.length,
            avgAtt,
            atRisk,
            avgMarks,
          };
        } catch {
          return {
            id: cls.id,
            name: cls.name,
            section: cls.section || '',
            studentCount: 0,
            avgAtt: null,
            atRisk: 0,
            avgMarks: null,
          };
        }
      }));

      // Rank by combined score (att 50% + marks 50%); null values go last
      const scored = classStats.map(r => {
        const attScore = r.avgAtt ?? 0;
        const markScore = r.avgMarks ?? 0;
        const score = r.avgMarks !== null ? (attScore + markScore) / 2 : attScore;
        return { ...r, score };
      });
      scored.sort((a, b) => b.score - a.score);
      scored.forEach((r, i) => { r.rank = i + 1; });
      setRows(scored);
    } catch (err) {
      console.error('ClassComparison error:', err);
    }
    setLoading(false);
  };

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === 'rank') return a.rank - b.rank;
    if (sortKey === 'att') return (b.avgAtt ?? -1) - (a.avgAtt ?? -1);
    if (sortKey === 'marks') return (b.avgMarks ?? -1) - (a.avgMarks ?? -1);
    if (sortKey === 'risk') return b.atRisk - a.atRisk;
    if (sortKey === 'students') return b.studentCount - a.studentCount;
    return 0;
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-500">{progress}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Summary banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Classes', value: rows.length, icon: BarChart2, color: 'bg-blue-500' },
            { label: 'Avg Attendance', value: rows.length ? `${Math.round(rows.reduce((s, r) => s + (r.avgAtt ?? 0), 0) / rows.filter(r => r.avgAtt !== null).length || 0)}%` : '—', icon: TrendingUp, color: 'bg-emerald-500' },
            { label: 'Avg Marks', value: rows.filter(r => r.avgMarks !== null).length ? `${Math.round(rows.filter(r => r.avgMarks !== null).reduce((s, r) => s + r.avgMarks, 0) / rows.filter(r => r.avgMarks !== null).length)}%` : '—', icon: Award, color: 'bg-purple-500' },
            { label: 'Total At-Risk', value: rows.reduce((s, r) => s + r.atRisk, 0), icon: AlertTriangle, color: 'bg-red-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`${color} text-white rounded-2xl p-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium opacity-80">{label}</span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <p className="text-2xl font-extrabold">{value}</p>
            </div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'rank', label: 'Overall Rank' },
            { key: 'att', label: 'Attendance' },
            { key: 'marks', label: 'Marks' },
            { key: 'risk', label: 'At-Risk' },
            { key: 'students', label: 'Students' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSortKey(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                sortKey === key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Class cards */}
        <div className="space-y-3">
          {sorted.map(row => (
            <div key={row.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${
              row.atRisk > 5 ? 'border-red-200' : 'border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <RankBadge rank={row.rank} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {row.name}{row.section ? ` – ${row.section}` : ''}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">{row.studentCount} students</span>
                      {row.atRisk > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full ml-1">
                          <AlertTriangle className="w-3 h-3" />
                          {row.atRisk} at-risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {row.avgMarks !== null && (
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-blue-600">{row.avgMarks}%</p>
                    <p className="text-xs text-slate-400">avg marks</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Attendance</span>
                    <span className={`font-bold ${
                      row.avgAtt === null ? 'text-slate-400' :
                      row.avgAtt >= 75 ? 'text-emerald-600' :
                      row.avgAtt >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>{row.avgAtt !== null ? `${row.avgAtt}%` : 'No data'}</span>
                  </div>
                  <Bar pct={row.avgAtt ?? 0} color={
                    row.avgAtt === null ? 'bg-slate-300' :
                    row.avgAtt >= 75 ? 'bg-emerald-500' :
                    row.avgAtt >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  } />
                </div>

                {row.avgMarks !== null && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600">Avg Marks</span>
                      <span className={`font-bold ${
                        row.avgMarks >= 80 ? 'text-emerald-600' :
                        row.avgMarks >= 60 ? 'text-blue-600' :
                        row.avgMarks >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{row.avgMarks}%</span>
                    </div>
                    <Bar pct={row.avgMarks} color={
                      row.avgMarks >= 80 ? 'bg-emerald-500' :
                      row.avgMarks >= 60 ? 'bg-blue-500' :
                      row.avgMarks >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    } />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <BarChart2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No classes found</p>
          </div>
        )}
      </main>
    </div>
  );
}
