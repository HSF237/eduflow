import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getTeacherByUserId,
  getClasses,
  getStudentsByClass,
  getAttendanceByClassAndDate,
  getPendingLeaveCountForClasses,
} from '@/lib/db';
import { createPageUrl } from '@/utils';
import {
  GraduationCap, Bell, Settings, LogOut, Users, Clock, BookOpen,
  AlertTriangle, ClipboardCheck, FileText, UserPlus, History,
  BarChart2, MessageSquare, BookMarked, CheckCircle, Loader2,
  CalendarDays, BookCopy, Megaphone, Cake,
} from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isLoadingAuth) load(authUser);
  }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassData(selectedClassId);
    }
  }, [selectedClassId]);

  const load = async (user) => {
    try {
      if (!user) {
        navigate('/login?role=teacher');
        return;
      }

      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) {
        navigate(createPageUrl('JoinSchool'));
        return;
      }

      setTeacher(teacherData);
      setSchool(teacherData.schools || null);

      const allClasses = await getClasses(teacherData.school_id);
      const myClasses = allClasses.filter((c) => c.teacher_id === teacherData.id);
      setClasses(myClasses);

      if (myClasses.length > 0) {
        setSelectedClassId(myClasses[0].id);
        const count = await getPendingLeaveCountForClasses(myClasses.map(c => c.id));
        setPendingLeaves(count);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Teacher dashboard load error:', err);
      setLoading(false);
    }
  };

  const loadClassData = async (classId) => {
    setLoading(true);
    try {
      const timeout = new Promise(res => setTimeout(() => res([[], []]), 10000));
      const [studs, att] = await Promise.race([
        Promise.all([
          getStudentsByClass(classId).catch(() => []),
          getAttendanceByClassAndDate(classId, today).catch(() => []),
        ]),
        timeout,
      ]);
      setStudents(studs);
      setTodayAttendance(att);
    } catch {
      // leave empty — don't stay stuck
    }
    setLoading(false);
  };

  const handleLogout = () => logout();

  const attendanceMarked = todayAttendance.length > 0;
  const presentCount = todayAttendance.filter(
    (a) => a.status === 'present' || a.status === 'Present'
  ).length;
  const absentCount = todayAttendance.filter(
    (a) => a.status === 'absent' || a.status === 'Absent'
  ).length;

  // At-risk: students who have < 75% attendance — we approximate with engagement_score or
  // derive from attendance. Since we only load today's att, we use student.engagement_score.
  const atRiskStudents = students.filter((s) => (s.engagement_score ?? 100) < 75);

  const upcomingBirthdays = (() => {
    const now = new Date();
    return students
      .filter(s => s.dob)
      .map(s => {
        const dob = new Date(s.dob + 'T00:00:00');
        const birthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (birthday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          birthday.setFullYear(now.getFullYear() + 1);
        }
        const days = Math.round((birthday - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / (1000 * 60 * 60 * 24));
        return { ...s, daysUntil: days };
      })
      .filter(s => s.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  })();

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classLabel = selectedClass
    ? `${selectedClass.name}${selectedClass.section ? ' - ' + selectedClass.section : ''}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  // Teacher is in the school but no classes assigned yet
  if (!loading && classes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg leading-tight">{teacher?.name || 'Teacher'}</span>
              <p className="text-xs text-slate-500 leading-tight">{school?.name || '—'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Classes Assigned Yet</h2>
          <p className="text-slate-500 mb-1 max-w-sm">
            You haven't been assigned to any classes. Select the classes you teach to get started.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Alternatively, ask your principal to assign you via Manage Classes.
          </p>
          <button
            onClick={() => navigate(createPageUrl('SelectClasses'))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Select My Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 text-base leading-tight truncate">
              {teacher?.name || 'Teacher'}
            </p>
            <p className="text-xs text-slate-500 leading-tight truncate">
              Teacher: {school?.name || '—'}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Settings"
            onClick={() => navigate(createPageUrl('TeacherSettings'))}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── CLASS SELECTOR ── */}
        {classes.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">
              Select Class:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full sm:w-auto border border-slate-300 rounded-lg px-3 py-2.5 sm:py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ' - ' + c.section : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Students */}
          <div className="bg-green-500 text-white rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">Students</span>
              <Users className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-4xl font-extrabold mt-1">{students.length}</p>
            <p className="text-xs opacity-80">In selected class</p>
          </div>

          {/* Today */}
          <div className="bg-orange-500 text-white rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">Today</span>
              <Clock className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-4xl font-extrabold mt-1">
              {attendanceMarked ? presentCount : '—'}
            </p>
            <p className="text-xs opacity-80">
              {attendanceMarked ? 'Present today' : 'Pending'}
            </p>
          </div>

          {/* My Classes */}
          <div className="bg-blue-500 text-white rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">My Classes</span>
              <BookOpen className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-4xl font-extrabold mt-1">{classes.length}</p>
            <p className="text-xs opacity-80">Total assigned</p>
          </div>

          {/* At Risk */}
          <div className="bg-red-500 text-white rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">At Risk</span>
              <AlertTriangle className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-4xl font-extrabold mt-1">{atRiskStudents.length}</p>
            <p className="text-xs opacity-80">&lt;75% attendance</p>
          </div>
        </div>

        {/* ── ACTION BUTTONS ROW 1 ── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => navigate(`/markattendance?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Mark Today's Attendance</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('ReviewLeave'))}
            className="relative flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Review Leave</span>
            {pendingLeaves > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {pendingLeaves > 9 ? '9+' : pendingLeaves}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate(createPageUrl('UnapprovedAbsences'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Unapproved Absences</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('ViewStudents')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>View Students</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('ManageStudents')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Add Students</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('AttendanceHistory')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Attendance History</span>
          </button>
        </div>

        {/* ── ACTION BUTTONS ROW 2 ── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => navigate(createPageUrl('TeacherManageExams'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <BookMarked className="w-4 h-4 shrink-0" />
            <span>Manage Exams</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('EnterMarks')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Enter Marks</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('Communication'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Messages</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('AttendanceAnalytics')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Attendance Analytics</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('Homework'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <BookCopy className="w-4 h-4 shrink-0" />
            <span>Homework</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('Timetable'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>Timetable</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('Announcements'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Announcements</span>
          </button>

          <button
            onClick={() => navigate(createPageUrl('Diary'))}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Daily Diary</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('ExamSchedule')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>Exam Schedule</span>
          </button>

          <button
            onClick={() => navigate(`${createPageUrl('PtmSchedule')}?classId=${selectedClassId}`)}
            className="flex items-center justify-center sm:justify-start gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors whitespace-normal text-center leading-tight"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>PTM Schedule</span>
          </button>
        </div>

        {/* ── UPCOMING BIRTHDAYS ── */}
        {upcomingBirthdays.length > 0 && (
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-rose-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cake className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-rose-700">Upcoming Birthdays (next 7 days)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingBirthdays.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-white border border-rose-100 rounded-xl px-3 py-2 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-extrabold text-rose-500">{s.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-rose-500 font-medium">
                      {s.daysUntil === 0 ? '🎂 Today!' : s.daysUntil === 1 ? 'Tomorrow' : `In ${s.daysUntil} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOTTOM CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Today's Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Today's Summary</h3>

            {!attendanceMarked ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  Attendance not marked for today
                </p>
                <button
                  onClick={() =>
                    navigate(`/markattendance?classId=${selectedClassId}`)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Mark Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Present</span>
                  <span className="text-sm font-bold text-green-600">{presentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Absent</span>
                  <span className="text-sm font-bold text-red-600">{absentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total</span>
                  <span className="text-sm font-bold text-slate-700">{students.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">At-Risk Students</h3>

            {atRiskStudents.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  All students are doing well!
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {atRiskStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {s.engagement_score ?? '—'}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
