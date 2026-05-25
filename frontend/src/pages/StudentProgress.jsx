import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStudentsByClass, getClassById, getExamsByClass,
  getMarksByStudent, getMarksByExams,
} from '@/lib/db';
import { ArrowLeft, Loader2, TrendingUp, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

const gradeFromPct = (p) =>
  p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' :
  p >= 50 ? 'C' : p >= 35 ? 'D' : 'F';

const gradeColor = (g) =>
  ['A+', 'A'].includes(g) ? 'text-green-600' :
  ['B+', 'B'].includes(g) ? 'text-blue-600' :
  g === 'C' ? 'text-yellow-600' : g === 'D' ? 'text-orange-600' : 'text-red-600';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value !== null ? `${p.value}%` : '—'}
        </p>
      ))}
    </div>
  );
};

export default function StudentProgress() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('studentId');
  const classId = params.get('classId');

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [examRows, setExamRows] = useState([]);
  const [overallPct, setOverallPct] = useState(null);
  const [rank, setRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!studentId || !classId) { navigate(-1); return; }
    try {
      const [students, cls, exams, myMarks] = await Promise.all([
        getStudentsByClass(classId),
        getClassById(classId),
        getExamsByClass(classId),
        getMarksByStudent(studentId),
      ]);

      const me = students.find(s => s.id === studentId);
      setStudent(me || null);
      setClassInfo(cls);
      setTotalStudents(students.length);

      const examIds = exams.map(e => e.id);
      const allMarks = examIds.length ? await getMarksByExams(examIds) : [];

      // Build per-exam data
      const myMarksMap = {};
      myMarks.forEach(m => { myMarksMap[m.exam_id] = Number(m.marks_obtained); });

      let totalObt = 0, totalMax = 0;
      const rows = [];
      const data = [];

      exams.forEach(exam => {
        const max = Number(exam.max_marks) || 100;
        const obtained = myMarksMap[exam.id] ?? null;
        const myPct = obtained !== null ? Math.round((obtained / max) * 100) : null;

        // Class average for this exam
        const examAllMarks = allMarks.filter(m => m.exam_id === exam.id);
        const avgPct = examAllMarks.length > 0
          ? Math.round(examAllMarks.reduce((s, m) => s + (Number(m.marks_obtained) / max) * 100, 0) / examAllMarks.length)
          : null;

        if (myPct !== null) {
          totalObt += obtained;
          totalMax += max;
          rows.push({ exam, obtained, max, myPct, grade: gradeFromPct(myPct), avgPct });
          data.push({ name: exam.name.length > 14 ? exam.name.slice(0, 14) + '…' : exam.name, You: myPct, 'Class Avg': avgPct });
        }
      });

      setChartData(data);
      setExamRows(rows);
      if (totalMax > 0) setOverallPct(Math.round((totalObt / totalMax) * 100));

      // Calculate rank
      const studentScores = students.map(s => {
        let obt = 0, mx = 0;
        exams.forEach(e => {
          const m = allMarks.find(mk => mk.exam_id === e.id && mk.student_id === s.id);
          if (m) { obt += Number(m.marks_obtained); mx += Number(e.max_marks) || 100; }
        });
        return { id: s.id, pct: mx > 0 ? obt / mx : 0 };
      });
      studentScores.sort((a, b) => b.pct - a.pct);
      const r = studentScores.findIndex(s => s.id === studentId) + 1;
      setRank(r > 0 ? r : null);
    } catch (err) {
      console.error('StudentProgress error:', err);
    }
    setLoading(false);
  };

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
            <h1 className="font-bold text-slate-800 truncate">{student?.name || 'Student'} — Progress</h1>
            <p className="text-xs text-slate-500">
              {classInfo?.name}{classInfo?.section ? ` – ${classInfo.section}` : ''}
            </p>
          </div>
          <TrendingUp className="w-5 h-5 text-blue-500 shrink-0" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Overall %</p>
            <p className={`text-2xl font-extrabold ${overallPct !== null ? gradeColor(gradeFromPct(overallPct)) : 'text-slate-400'}`}>
              {overallPct !== null ? `${overallPct}%` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Grade</p>
            <p className={`text-2xl font-extrabold ${overallPct !== null ? gradeColor(gradeFromPct(overallPct)) : 'text-slate-400'}`}>
              {overallPct !== null ? gradeFromPct(overallPct) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Class Rank</p>
            <p className="text-2xl font-extrabold text-purple-600">
              {rank ? `#${rank}` : '—'}
            </p>
            {rank && <p className="text-xs text-slate-400">of {totalStudents}</p>}
          </div>
        </div>

        {/* Bar chart */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800">Marks per Exam</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Pass', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="You" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Class Avg" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No marks recorded yet</p>
          </div>
        )}

        {/* Exam breakdown table */}
        {examRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Exam Breakdown</h3>
            <div className="space-y-2">
              {examRows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{row.exam.name}</p>
                    {row.exam.subject && <p className="text-xs text-slate-400">{row.exam.subject}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-700">{row.obtained} / {row.max}</p>
                    <p className="text-xs text-slate-400">{row.avgPct !== null ? `Class avg: ${row.avgPct}%` : ''}</p>
                  </div>
                  <div className="w-12 text-center shrink-0">
                    <span className={`text-sm font-bold ${gradeColor(row.grade)}`}>{row.grade}</span>
                    <p className="text-xs text-slate-400">{row.myPct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
