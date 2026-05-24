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

export default function UnapprovedAbsences() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [absences, setAbsences] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [backTo, setBackTo] = useState('TeacherDashboard');

  // Raw data
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

      const [school, teacher] = await Promise.all([
        getSchoolByPrincipal(user.uid),
        getTeacherByUserId(user.uid),
      ]);

      let schoolId, myClassIds;
      if (school) {
        setBackTo('PrincipalDashboard');
        schoolId = school.id;
        myClassIds = null; // all classes
      } else if (teacher) {
        setBackTo('TeacherDashboard');
        schoolId = teacher.school_id;
        const allCls = await getClasses(schoolId);
        myClassIds = allCls.filter(c => c.teacher_id === teacher.id).map(c => c.id);
      } else {
        navigate('/'); return;
      }

      const [studs, cls, leaves] = await Promise.all([
        getStudents(schoolId),
        getClasses(schoolId),
        getLeaveRequests(schoolId),
      ]);

      const filteredClasses = myClassIds ? cls.filter(c => myClassIds.includes(c.id)) : cls;
      setClasses(filteredClasses);
      setAllStudents(studs);
      setAllLeaves(leaves);

      // Fetch attendance for relevant classes
      const attPromises = filteredClasses.map(c => getAttendanceByClass(c.id));
      const attArrays = await Promise.all(attPromises);
      setAllAttendance(attArrays.flat());
    } catch (err) {
      console.error('UnapprovedAbsences error:', err);
    }
    setLoading(false);
  };

  const computeAbsences = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const result = allAttendance.filter(a => {
      if (!['absent', 'Absent'].includes(a.status)) return false;
      if (a.date < cutoffStr) return false;
      if (selectedClass !== 'all' && a.class_id !== selectedClass) return false;
      const approved = allLeaves.find(l =>
        l.student_id === a.student_id && l.status === 'approved' &&
        a.date >= l.from_date && a.date <= l.to_date
      );
      return !approved;
    }).map(a => {
      const student = allStudents.find(s => s.id === a.student_id);
      return { ...a, student_name: student?.name || '—', roll_number: student?.roll_number || '—' };
    }).sort((a, b) => b.date.localeCompare(a.date));

    setAbsences(result);
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(createPageUrl(backTo))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-bold text-lg text-slate-800">Unapproved Absences</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-500 text-white rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Total Unapproved</p>
              <p className="text-3xl font-bold">{absences.length}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-200" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Filter by Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Absences list */}
        {absences.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p className="font-semibold text-slate-600 text-lg mb-1">No unapproved absences!</p>
            <p className="text-sm">All absences have approved leave applications.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absences.map(a => (
              <div key={`${a.student_id}-${a.date}`}
                className="bg-white rounded-xl border-l-4 border-red-500 border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{a.student_name}</p>
                    <p className="text-xs text-slate-500">Roll: {a.roll_number}</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Absent</span>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{getClassName(a.class_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <span className="text-xs text-slate-400">({daysSince(a.date)} days ago)</span>
                  </div>
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
  );
}
