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
import AppLayout from '@/components/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function Reports() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=principal'); return; }
      const sch = await getSchoolByPrincipal(user.uid);
      if (!sch) { navigate(createPageUrl('SetupSchool')); return; }

      const [clsList, stuList] = await Promise.all([
        getClasses(sch.id),
        getStudents(sch.id),
      ]);
      setClasses(clsList);
      setStudents(stuList);

      const attPromises = clsList.map(c => getAttendanceByClass(c.id));
      const attResults = await Promise.all(attPromises);
      const map = {};
      clsList.forEach((c, idx) => {
        map[c.id] = attResults[idx] || [];
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error('Reports load error:', err);
    }
    setLoading(false);
  };

  const selectedStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.class_id === selectedClass);

  const calculateStudentStats = (student) => {
    const classAtt = attendanceMap[student.class_id] || [];
    const myAtt = classAtt.filter(a => a.student_id === student.id);
    if (myAtt.length === 0) return { pct: 100, present: 0, total: 0 };

    const presentCount = myAtt.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const pct = Math.round((presentCount / myAtt.length) * 100);
    return { pct, present: presentCount, total: myAtt.length };
  };

  const studentStatsList = selectedStudents.map(s => ({
    ...s,
    ...calculateStudentStats(s),
  }));

  const overallPresent = studentStatsList.reduce((acc, s) => acc + s.present, 0);
  const overallTotal = studentStatsList.reduce((acc, s) => acc + s.total, 0);
  const overallAttendancePct = overallTotal > 0
    ? Math.round((overallPresent / overallTotal) * 100)
    : 100;

  const highEngagementCount = studentStatsList.filter(s => s.pct >= 75).length;
  const mediumEngagementCount = studentStatsList.filter(s => s.pct >= 50 && s.pct < 75).length;
  const lowEngagementCount = studentStatsList.filter(s => s.pct < 50).length;

  const pieData = [
    { name: 'High (≥75%)', value: highEngagementCount },
    { name: 'Medium (50-74%)', value: mediumEngagementCount },
    { name: 'Low (<50%)', value: lowEngagementCount },
  ];

  const classBarData = classes.map(c => {
    const cAtt = attendanceMap[c.id] || [];
    if (cAtt.length === 0) return { name: c.name, pct: 100 };
    const pCount = cAtt.filter(a => (a.status || '').toLowerCase() === 'present').length;
    return {
      name: c.name,
      pct: Math.round((pCount / cAtt.length) * 100),
    };
  });

  const atRiskStudents = studentStatsList.filter(s => s.pct < 75);

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <AppLayout title="Reports & Analytics">
      <div className="min-h-screen bg-slate-50">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex justify-end">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `- ${cls.section}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Attendance</span>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{overallAttendancePct}%</p>
              <p className="text-xs text-slate-600 mt-1">Across all recorded sessions</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Students</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{selectedStudents.length}</p>
              <p className="text-xs text-slate-600 mt-1">{selectedClass === 'all' ? 'Enrolled in school' : 'In selected class'}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">High Engagement</span>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{highEngagementCount}</p>
              <p className="text-xs text-slate-600 mt-1">≥75% attendance rate</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Engagement</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{lowEngagementCount}</p>
              <p className="text-xs text-slate-600 mt-1">&lt;50% attendance rate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> Attendance by Class (%)
              </h2>
              {classBarData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No attendance data recorded yet</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                      <Bar dataKey="pct" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-4">Engagement Levels</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2 text-xs">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> At-Risk Students (&lt;75% Attendance)
            </h2>
            {atRiskStudents.length === 0 ? (
              <p className="text-sm text-slate-600 font-medium py-4 text-center">🎉 Great news! All students have attendance ≥75%.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {atRiskStudents.map((student) => (
                  <div key={student.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-600">{getClassName(student.class_id)}</p>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${student.pct < 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {student.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
