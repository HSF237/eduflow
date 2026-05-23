import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getStudentsByClass, getAttendanceByClass, getMessages } from '@/lib/db';
import {
  GraduationCap, MessageCircle, Calendar, LogOut, Loader2,
  TrendingUp, CheckCircle2, XCircle, Clock, AlertTriangle
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`${color} rounded-2xl p-4 text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-90">{label}</span>
        <Icon className="w-5 h-5 opacity-80" />
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [attendancePct, setAttendancePct] = useState(null);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [recentRecords, setRecentRecords] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const studentId = localStorage.getItem('parent_student_id');
  const studentName = localStorage.getItem('parent_student_name') || 'Student';
  const classId = localStorage.getItem('parent_class_id');

  useEffect(() => {
    if (!studentId) { navigate(createPageUrl('ParentLogin')); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [students, attendance, messages] = await Promise.all([
        classId ? getStudentsByClass(classId) : Promise.resolve([]),
        classId ? getAttendanceByClass(classId) : Promise.resolve([]),
        getMessages(studentId),
      ]);

      // Find this student
      const me = students.find(s => s.id === studentId);
      setStudent(me || { name: studentName });

      // Attendance stats for this student only
      const myAtt = attendance.filter(r => r.student_id === studentId);
      const present = myAtt.filter(r => ['present', 'Present'].includes(r.status)).length;
      const absent = myAtt.filter(r => ['absent', 'Absent'].includes(r.status)).length;
      const late = myAtt.filter(r => ['late', 'Late'].includes(r.status)).length;
      const total = myAtt.length;

      setPresentCount(present);
      setAbsentCount(absent);
      setLateCount(late);
      setAttendancePct(total > 0 ? Math.round(((present + late) / total) * 100) : null);

      // Last 7 attendance records
      const sorted = [...myAtt].sort((a, b) => (b.date > a.date ? 1 : -1));
      setRecentRecords(sorted.slice(0, 7));

      // Unread teacher messages
      const lastRead = parseInt(localStorage.getItem(`msg_read_${studentId}`) || '0');
      const unread = messages.filter(m => {
        if (m.sender_type !== 'teacher') return false;
        const ms = m.created_at?.toMillis?.() ?? (m.created_at?.seconds ? m.created_at.seconds * 1000 : 0);
        return ms > lastRead;
      }).length;
      setUnreadMessages(unread);
    } catch (err) {
      console.error('Error loading parent dashboard:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    ['parent_student_id', 'parent_student_name', 'parent_class_id', 'parent_school_id']
      .forEach(k => localStorage.removeItem(k));
    navigate(createPageUrl('RoleSelection'));
  };

  const getStatusColor = (pct) => {
    if (pct === null) return 'text-slate-500';
    if (pct >= 75) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusLabel = (pct) => {
    if (pct === null) return 'No data';
    if (pct >= 75) return 'Good Standing';
    if (pct >= 50) return 'Needs Improvement';
    return 'At Risk';
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-6 h-6 text-white shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{studentName}</p>
              <p className="text-purple-200 text-xs">Parent Dashboard</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 shrink-0">
            <button onClick={() => navigate(createPageUrl('Communication'))}
              className="relative p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Messages">
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
            <button onClick={() => navigate(createPageUrl('ApplyLeave'))}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Apply Leave">
              <Calendar className="w-5 h-5" />
            </button>
            <button onClick={handleLogout}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Attendance % hero card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 ${
            attendancePct === null ? 'border-slate-200' :
            attendancePct >= 75 ? 'border-green-400' :
            attendancePct >= 50 ? 'border-yellow-400' : 'border-red-400'
          }`}>
            <span className={`text-2xl font-extrabold ${getStatusColor(attendancePct)}`}>
              {attendancePct !== null ? `${attendancePct}%` : '—'}
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Overall Attendance</p>
            <p className={`text-lg font-bold mt-0.5 ${getStatusColor(attendancePct)}`}>
              {getStatusLabel(attendancePct)}
            </p>
            {attendancePct !== null && attendancePct < 75 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Minimum 75% required
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={CheckCircle2} label="Present" value={presentCount} color="bg-green-500" />
          <StatCard icon={XCircle} label="Absent" value={absentCount} color="bg-red-500" />
          <StatCard icon={Clock} label="Late" value={lateCount} color="bg-orange-500" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate(createPageUrl('Communication'))}
            className="relative bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-purple-300 hover:shadow-sm transition-all text-left">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Messages</p>
              <p className="text-xs text-slate-500">Teacher chat</p>
            </div>
            {unreadMessages > 0 && (
              <span className="absolute top-3 right-3 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {unreadMessages}
              </span>
            )}
          </button>
          <button onClick={() => navigate(createPageUrl('ApplyLeave'))}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Apply Leave</p>
              <p className="text-xs text-slate-500">Request absence</p>
            </div>
          </button>
        </div>

        {/* Recent attendance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Recent Attendance (Last 7 days)</h3>
          </div>
          {recentRecords.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No attendance records yet</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((r, i) => {
                const status = (r.status || '').toLowerCase();
                const isPresent = status === 'present';
                const isLate = status === 'late';
                const isAbsent = status === 'absent';
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-600">{formatDate(r.date)}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isPresent ? 'bg-green-100 text-green-700' :
                      isLate ? 'bg-orange-100 text-orange-700' :
                      isAbsent ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {isPresent ? 'Present' : isLate ? 'Late' : isAbsent ? 'Absent' : r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
