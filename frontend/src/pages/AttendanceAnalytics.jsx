import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getClasses, getAttendanceByClass, getStudentsByClass } from '@/lib/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Download, Users, CheckCircle, AlertTriangle, TrendingDown, Loader2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];
const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export default function AttendanceAnalytics() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => { if (!isLoadingAuth) loadInitial(authUser); }, [isLoadingAuth, authUser]);
  useEffect(() => { if (selectedClass) loadClassData(selectedClass); }, [selectedClass]);

  const loadInitial = async (user) => {
    try {
      if (!user) { navigate(createPageUrl('Login')); return; }
      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) { navigate(createPageUrl('JoinSchool')); return; }
      setTeacher(teacherData);
      const allClasses = await getClasses(teacherData.school_id);
      const myClasses = allClasses.filter(c => c.teacher_id === teacherData.id);
      setClasses(myClasses);
      if (myClasses.length > 0) setSelectedClass(myClasses[0].id);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadClassData = async (classId) => {
    try {
      const [studs, att] = await Promise.all([getStudentsByClass(classId), getAttendanceByClass(classId)]);
      setStudents(studs); setAttendance(att);
    } catch (err) { console.error(err); }
  };

  const filteredAttendance = selectedMonth === 'all'
    ? attendance
    : attendance.filter(a => a.date?.slice(5, 7) === selectedMonth);

  const studentStats = students.map(student => {
    const records = filteredAttendance.filter(a => a.student_id === student.id);
    const total = records.length;
    const present = records.filter(a => ['present', 'late', 'Present', 'Late'].includes(a.status)).length;
    const absent = records.filter(a => ['absent', 'Absent'].includes(a.status)).length;
    const late = records.filter(a => ['late', 'Late'].includes(a.status)).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 100;
    return { ...student, total, present, absent, late, pct };
  });

  const avgPct = studentStats.length ? Math.round(studentStats.reduce((s, x) => s + x.pct, 0) / studentStats.length) : 0;
  const totalAbsent = studentStats.reduce((s, x) => s + x.absent, 0);
  const lowCount = studentStats.filter(s => s.pct < 75).length;

  const dailyMap = {};
  filteredAttendance.forEach(a => {
    if (!dailyMap[a.date]) dailyMap[a.date] = { date: a.date, Present: 0, Absent: 0, Late: 0 };
    const s = (a.status || '').toLowerCase();
    if (s === 'present') dailyMap[a.date].Present++;
    else if (s === 'absent') dailyMap[a.date].Absent++;
    else if (s === 'late') dailyMap[a.date].Late++;
  });
  const dailyTrend = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }));

  const totalPresent = studentStats.reduce((s, x) => s + x.present, 0);
  const pieData = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent', value: totalAbsent },
    { name: 'Late', value: studentStats.reduce((s, x) => s + x.late, 0) },
  ].filter(d => d.value > 0);

  const barData = studentStats.slice(0, 15).map(s => ({ name: s.name.split(' ')[0], Attendance: s.pct }));
  const selectedClassInfo = classes.find(c => c.id === selectedClass);
  const periodLabel = selectedMonth === 'all' ? 'All Time' : MONTHS.find(m => m.value === selectedMonth)?.label || '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header — minimal on mobile */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-base leading-tight truncate">Attendance Analytics</h1>
              <p className="text-xs text-slate-500 truncate">{teacher?.name}</p>
            </div>
          </div>
          <button onClick={() => window.print()}
            className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Filters row */}
        <div className="flex gap-2">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}{cls.section ? ' - ' + cls.section : ''}</option>
            ))}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">All Months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-bold">
            Attendance Report — {selectedClassInfo?.name}{selectedClassInfo?.section ? ' ' + selectedClassInfo.section : ''}
          </h2>
          <p className="text-emerald-100 text-sm mt-1">{periodLabel} · {students.length} Students</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Students', value: students.length, icon: Users, bg: 'bg-blue-500' },
            { label: 'Avg Attendance', value: `${avgPct}%`, icon: CheckCircle, bg: 'bg-emerald-500' },
            { label: 'Low Attendance', value: lowCount, icon: AlertTriangle, bg: 'bg-orange-500' },
            { label: 'Total Absences', value: totalAbsent, icon: TrendingDown, bg: 'bg-red-500' },
          ].map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className={`${bg} text-white rounded-xl p-3 sm:p-4 flex items-center justify-between`}>
              <div>
                <p className="text-white/75 text-xs font-medium leading-tight">{label}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5">{value}</p>
              </div>
              <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white/30 shrink-0" />
            </div>
          ))}
        </div>

        {/* Daily Trend — full width on mobile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Attendance Trend</h3>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No attendance data yet.</div>
          )}
        </div>

        {/* Pie + Student bar side by side on desktop, stacked on mobile */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Overall Distribution</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data yet.</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Student Attendance %</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={28} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="Attendance" radius={[3, 3, 0, 0]}>
                    {barData.map((e, i) => (
                      <Cell key={i} fill={e.Attendance >= 75 ? '#10b981' : e.Attendance >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No student data yet.</div>
            )}
          </div>
        </div>

        {/* Full table — scrollable */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Complete Attendance Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Roll', 'Name', 'P', 'A', 'L', '%'].map(h => (
                    <th key={h} className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentStats.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No student data.</td></tr>
                ) : (
                  studentStats.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 sm:px-4 py-3 text-slate-500 text-xs">{s.roll_number || '—'}</td>
                      <td className="px-3 sm:px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 sm:px-4 py-3 text-emerald-600 font-medium">{s.present}</td>
                      <td className="px-3 sm:px-4 py-3 text-red-500 font-medium">{s.absent}</td>
                      <td className="px-3 sm:px-4 py-3 text-yellow-600 font-medium">{s.late}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold
                          ${s.pct >= 75 ? 'bg-emerald-100 text-emerald-700' : s.pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                          {s.pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
