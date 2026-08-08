import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getSchoolByPrincipal,
  getStudents, getClasses, getLeaveRequests,
  getAttendanceByClass
} from '@/lib/db';
import { ArrowLeft, Loader2, AlertTriangle, Calendar, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function UnapprovedAbsences() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [absences, setAbsences] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [backTo, setBackTo] = useState('TeacherDashboard');

  const [allAttendance, setAllAttendance] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (!loading) computeAbsences();
  }, [selectedClass, dateRange, allAttendance, allStudents, allLeaves]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login'); return; }

      let sid = null;
      const school = await getSchoolByPrincipal(user.uid);
      if (school) {
        sid = school.id;
        setBackTo('PrincipalDashboard');
      } else {
        const teacher = await getTeacherByUserId(user.uid);
        if (teacher) sid = teacher.school_id;
      }

      if (sid) {
        const [clsList, stuList, leaveList] = await Promise.all([
          getClasses(sid),
          getStudents(sid),
          getLeaveRequests(sid),
        ]);
        setClasses(clsList);
        setAllStudents(stuList);
        setAllLeaves(leaveList);

        const attArrays = await Promise.all(clsList.map(c => getAttendanceByClass(c.id)));
        setAllAttendance(attArrays.flat());
      }
    } catch (err) {
      console.error('Error loading UnapprovedAbsences data:', err);
    }
    setLoading(false);
  };

  const computeAbsences = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const abs = [];
    allAttendance.forEach(a => {
      if ((a.status || '').toLowerCase() === 'absent' && a.date >= cutoffStr) {
        if (selectedClass !== 'all' && a.class_id !== selectedClass) return;

        const hasApprovedLeave = allLeaves.some(l =>
          l.student_id === a.student_id &&
          l.status === 'approved' &&
          a.date >= l.from_date &&
          a.date <= l.to_date
        );

        if (!hasApprovedLeave) {
          const student = allStudents.find(s => s.id === a.student_id);
          abs.push({
            ...a,
            student_name: student ? student.name : 'Unknown Student',
          });
        }
      }
    });

    setAbsences(abs);
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '—';
  };

  const daysSince = (d) => Math.ceil((new Date() - new Date(d)) / 86400000);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-red-600" />
    </div>
  );

  return (
    <AppLayout title="Unapproved Absences">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl(backTo))}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-bold text-lg text-slate-800">Unapproved Absences</h1>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-500 text-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-100 uppercase tracking-wider">Unapproved Absences</p>
                <p className="text-2xl font-bold mt-1">{absences.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Class:</span>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none">
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Time Window:</span>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none">
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
          </div>

          {absences.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              No unapproved absences detected in this timeframe!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {absences.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{item.student_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        {daysSince(item.date)}d ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Date: <strong className="text-slate-700">{item.date}</strong>
                    </p>
                    <p className="text-xs text-slate-500">Class: {getClassName(item.class_id)}</p>
                  </div>
                  <p className="mt-3 text-xs text-red-600 font-medium border-t border-slate-100 pt-2">
                    ⚠ No approved leave application
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
