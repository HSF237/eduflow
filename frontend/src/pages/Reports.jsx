import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal,
  getClasses,
  getStudents,
  getAttendanceByClass,
} from '@/lib/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Loader2, BarChart3, Users, TrendingUp, AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function Reports() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => { if (!isLoadingAuth) loadData(authUser); }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate(createPageUrl('Login')); return; }

      const schoolData = await getSchoolByPrincipal(user.uid);
      if (!schoolData) { navigate(createPageUrl('SetupSchool')); return; }
      setSchool(schoolData);

      const [classData, studentData] = await Promise.all([
        getClasses(schoolData.id),
        getStudents(schoolData.id),
      ]);
      setClasses(classData);
      setStudents(studentData);

      // Load attendance per class
      const attMap = {};
      await Promise.all(
        classData.map(async cls => {
          const att = await getAttendanceByClass(cls.id);
          attMap[cls.id] = att;
        })
      );
      setAttendanceMap(attMap);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Attendance % per class (for bar chart)
  const classAttendanceData = classes.map(cls => {
    const att = attendanceMap[cls.id] || [];
    const present = att.filter(a => ['present', 'late', 'Present', 'Late'].includes(a.status)).length;
    const total = att.length;
    return {
      name: `${cls.name}${cls.section ? ' ' + cls.section : ''}`,
      attendance: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  // Per-student attendance %
  const getStudentAttendancePct = (studentId) => {
    let present = 0, total = 0;
    Object.values(attendanceMap).forEach(records => {
      records.forEach(a => {
        if (a.student_id === studentId) {
          total += 1;
          if (['present', 'late', 'Present', 'Late'].includes(a.status)) present += 1;
        }
      });
    });
    return total > 0 ? Math.round((present / total) * 100) : 100;
  };

  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.class_id === selectedClass);

  const studentsWithPct = filteredStudents.map(s => ({
    ...s,
    pct: getStudentAttendancePct(s.id),
  }));

  // Engagement distribution (based on attendance %)
  const good = studentsWithPct.filter(s => s.pct >= 75).length;
  const average = studentsWithPct.filter(s => s.pct >= 50 && s.pct < 75).length;
  const atRisk = studentsWithPct.filter(s => s.pct < 50).length;
  const engagementData = [
    { name: 'Good (≥75%)', value: good },
    { name: 'Average (50-74%)', value: average },
    { name: 'At-Risk (<50%)', value: atRisk },
  ].filter(d => d.value > 0);

  // Top performers
  const topStudents = [...studentsWithPct]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // At-risk students
  const atRiskStudents = studentsWithPct
    .filter(s => s.pct < 50)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <button
              onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800">Reports & Analytics</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter */}
        <div className="mb-6">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}{cls.section ? ' - ' + cls.section : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Top 2 Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Attendance by Class */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-700">Attendance by Class</h3>
            </div>
            {classAttendanceData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={v => `${v}%`} />
                    <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-56 text-slate-400 text-sm">
                No attendance data yet.
              </div>
            )}
          </div>

          {/* Engagement Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-700">Engagement Distribution</h3>
            </div>
            {engagementData.length > 0 ? (
              <div className="h-56 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engagementData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                    >
                      {engagementData.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} students`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-56 gap-2 text-slate-400 text-sm">
                <Users className="w-10 h-10 text-slate-200" />
                No student data.
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {[
                { label: 'Good (≥75%)', color: '#10b981', count: good },
                { label: 'Average (50-74%)', color: '#f59e0b', count: average },
                { label: 'At-Risk (<50%)', color: '#ef4444', count: atRisk },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {label}: {count}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 2 Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Top Performers</h3>
            </div>
            {topStudents.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No students found.</p>
            ) : (
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{student.name}</p>
                        <p className="text-xs text-slate-500">{getClassName(student.class_id)}</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {student.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-700">At-Risk Students</h3>
            </div>
            {atRiskStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-slate-600 text-sm font-medium">No at-risk students!</p>
                <p className="text-slate-400 text-xs text-center">All students have adequate attendance.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{student.name}</p>
                      <p className="text-xs text-slate-500">{getClassName(student.class_id)}</p>
                    </div>
                    <span className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {student.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
