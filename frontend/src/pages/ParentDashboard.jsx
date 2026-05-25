import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getStudentsByClass, getAttendanceByClassInYear, getMessages,
  getHomeworkByClass, getTimetable, getAnnouncementsByClass, getClassById, getDiaryByClass,
  getSchoolById, getAcademicYearDates, getStudentByParentCode, getExamScheduleByClass,
} from '@/lib/db';
import { requestAndSaveToken, onForegroundMessage } from '@/lib/fcm';
import {
  GraduationCap, MessageCircle, Calendar, LogOut, Loader2,
  TrendingUp, CheckCircle2, XCircle, Clock, AlertTriangle,
  BookCopy, CalendarDays, Megaphone, BookOpen, UserPlus, X, KeyRound, Plus, CalendarCheck,
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAILY_QUOTES = [
  "The secret of getting ahead is getting started.",
  "Education is the passport to the future.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Believe you can and you're halfway there.",
  "Hard work beats talent when talent doesn't work hard.",
  "Every expert was once a beginner.",
  "The more that you read, the more things you will know.",
  "Don't watch the clock; do what it does. Keep going.",
  "You don't have to be great to start, but you have to start to be great.",
  "Learning is not attained by chance; it must be sought with ardor.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Strive for progress, not perfection.",
  "Push yourself, because no one else is going to do it for you.",
  "Dream it. Wish it. Do it.",
  "Great things never come from comfort zones.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard is not impossible.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up. Be awesome. Repeat.",
  "Study hard, for the well is deep.",
  "An investment in knowledge pays the best interest.",
  "The roots of education are bitter, but the fruit is sweet.",
  "Today a reader, tomorrow a leader.",
  "Genius is one percent inspiration and ninety-nine percent perspiration.",
  "You are braver than you believe, stronger than you seem.",
  "Start where you are. Use what you have. Do what you can.",
  "It always seems impossible until it's done.",
  "Keep going. Everything you need will come to you at the perfect time.",
];

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
};
const todayQuote = DAILY_QUOTES[getDayOfYear() % DAILY_QUOTES.length];

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
  const [homework, setHomework] = useState([]);
  const [todayPeriods, setTodayPeriods] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [todayDiary, setTodayDiary] = useState([]);
  const [examSchedule, setExamSchedule] = useState([]);

  // Sibling switcher
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const studentId = localStorage.getItem('parent_student_id');
  const studentName = localStorage.getItem('parent_student_name') || 'Student';
  const classId = localStorage.getItem('parent_class_id');

  useEffect(() => {
    if (!studentId) { navigate(createPageUrl('ParentLogin')); return; }

    // Load or migrate linked students list
    try {
      const raw = JSON.parse(localStorage.getItem('parent_linked_students') || '[]');
      // Migrate: if existing session has no linked list yet, create one
      if (raw.length === 0 && studentId) {
        const entry = { id: studentId, name: localStorage.getItem('parent_student_name') || '', class_id: classId || '', school_id: localStorage.getItem('parent_school_id') || '' };
        localStorage.setItem('parent_linked_students', JSON.stringify([entry]));
        setLinkedStudents([entry]);
      } else {
        setLinkedStudents(raw);
      }
    } catch { setLinkedStudents([]); }

    setActiveStudentId(studentId);
    loadData();
    // FCM runs after load, completely non-blocking
    setTimeout(() => {
      requestAndSaveToken(studentId);
      onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'EduSphere';
        const body  = payload.notification?.body  || '';
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/edusphere.svg' });
        }
      });
    }, 3000);
  }, [activeStudentId]);

  const safe = (promise, fallback) =>
    promise.catch(() => fallback);

  const withTimeout = (promise, ms, fallback) =>
    Promise.race([promise, new Promise(res => setTimeout(() => res(fallback), ms))]);

  const loadData = async () => {
    try {
      // Fetch school first (single read) to know the academic year date range
      const schoolId = localStorage.getItem('parent_school_id');
      const school = schoolId ? await safe(getSchoolById(schoolId), null) : null;
      const { start, end } = getAcademicYearDates(school);

      const [students, attendance, messages, hw, tt, ann, cls, diary, examSched] = await withTimeout(
        Promise.all([
          classId ? safe(getStudentsByClass(classId), []) : Promise.resolve([]),
          classId ? safe(getAttendanceByClassInYear(classId, start, end), []) : Promise.resolve([]),
          safe(getMessages(studentId), []),
          classId ? safe(getHomeworkByClass(classId), []) : Promise.resolve([]),
          classId ? safe(getTimetable(classId), null) : Promise.resolve(null),
          classId ? safe(getAnnouncementsByClass(classId), []) : Promise.resolve([]),
          classId ? safe(getClassById(classId), null) : Promise.resolve(null),
          classId ? safe(getDiaryByClass(classId), []) : Promise.resolve([]),
          classId ? safe(getExamScheduleByClass(classId), []) : Promise.resolve([]),
        ]),
        12000,
        [[], [], [], [], null, [], null, [], []]
      );
      setClassInfo(cls);

      const me = students.find(s => s.id === studentId);
      setStudent(me || { name: studentName });

      const myAtt = attendance.filter(r => r.student_id === studentId);
      const present = myAtt.filter(r => ['present', 'Present'].includes(r.status)).length;
      const absent = myAtt.filter(r => ['absent', 'Absent'].includes(r.status)).length;
      const late = myAtt.filter(r => ['late', 'Late'].includes(r.status)).length;
      const total = myAtt.length;
      setPresentCount(present);
      setAbsentCount(absent);
      setLateCount(late);
      setAttendancePct(total > 0 ? Math.round(((present + late) / total) * 100) : null);

      const sorted = [...myAtt].sort((a, b) => (b.date > a.date ? 1 : -1));
      setRecentRecords(sorted.slice(0, 7));

      const lastRead = parseInt(localStorage.getItem(`msg_read_${studentId}`) || '0');
      const unread = messages.filter(m => {
        if (m.sender_type !== 'teacher') return false;
        const ms = m.created_at?.toMillis?.() ?? (m.created_at?.seconds ? m.created_at.seconds * 1000 : 0);
        return ms > lastRead;
      }).length;
      setUnreadMessages(unread);

      // Homework: show only today + future, sorted by due date
      const today = new Date().toISOString().split('T')[0];
      const upcomingHw = hw
        .filter(h => h.due_date >= today)
        .sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
      setHomework(upcomingHw);

      // Timetable: today's periods
      if (tt) {
        const dayName = DAY_NAMES[new Date().getDay()];
        const periods = tt[dayName] || [];
        setTodayPeriods(periods.filter(Boolean));
      }

      // Announcements: newest 5
      setAnnouncements(ann.slice(0, 5));

      // Diary: today's entries only
      const todayStr = new Date().toISOString().split('T')[0];
      setTodayDiary((diary || []).filter(d => d.date === todayStr));

      // Exam schedule: upcoming only, sorted by date
      const upcomingExams = (examSched || [])
        .filter(e => e.date >= todayStr)
        .sort((a, b) => a.date > b.date ? 1 : -1);
      setExamSchedule(upcomingExams);
    } catch (err) {
      console.error('Error loading parent dashboard:', err);
    }
    setLoading(false);
  };

  const switchChild = (child) => {
    if (child.id === localStorage.getItem('parent_student_id')) return;
    localStorage.setItem('parent_student_id', child.id);
    localStorage.setItem('parent_student_name', child.name);
    localStorage.setItem('parent_class_id', child.class_id);
    localStorage.setItem('parent_school_id', child.school_id);
    setLoading(true);
    setActiveStudentId(child.id);
  };

  const handleAddChild = async () => {
    const clean = addCode.replace('-', '');
    if (clean.length < 8) return;
    setAddLoading(true);
    setAddError('');
    try {
      const student = await getStudentByParentCode(addCode);
      if (!student) { setAddError('Invalid code. Please check and try again.'); setAddLoading(false); return; }
      const current = JSON.parse(localStorage.getItem('parent_linked_students') || '[]');
      if (current.find(s => s.id === student.id)) { setAddError('This child is already linked.'); setAddLoading(false); return; }
      if (current.length >= 6) { setAddError('Maximum 6 children per account.'); setAddLoading(false); return; }
      const entry = { id: student.id, name: student.name || '', class_id: student.class_id || '', school_id: student.school_id || '' };
      current.push(entry);
      localStorage.setItem('parent_linked_students', JSON.stringify(current));
      setLinkedStudents(current);
      setShowAddChild(false);
      setAddCode('');
    } catch { setAddError('Something went wrong. Please try again.'); }
    setAddLoading(false);
  };

  const handleLogout = () => {
    ['parent_student_id', 'parent_student_name', 'parent_class_id', 'parent_school_id', 'parent_linked_students']
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

  const formatDueDate = (d) => {
    const today = new Date().toISOString().split('T')[0];
    if (d === today) return 'Today';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getDueColor = (d) => {
    const today = new Date().toISOString().split('T')[0];
    if (d === today) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const todayLabel = DAY_NAMES[new Date().getDay()];

  const formatAnnTime = (ts) => {
    if (!ts) return '';
    const ms = ts.toMillis?.() ?? (ts.seconds ? ts.seconds * 1000 : 0);
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
            <button onClick={() => { setShowAddChild(true); setAddCode(''); setAddError(''); }}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Add Child">
              <UserPlus className="w-5 h-5" />
            </button>
            <button onClick={handleLogout}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Child switcher */}
        {linkedStudents.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {linkedStudents.map(child => (
              <button
                key={child.id}
                onClick={() => switchChild(child)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  child.id === studentId
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Student info card */}
        {student && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <span className="text-white font-extrabold text-xl">
                {(student.name || studentName).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-base truncate">{student.name || studentName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {classInfo && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Class:</span> {classInfo.name}{classInfo.section ? ` – ${classInfo.section}` : ''}
                  </span>
                )}
                {student.roll_number && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Roll No:</span> {student.roll_number}
                  </span>
                )}
                {student.admission_number && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Adm No:</span> {student.admission_number}
                  </span>
                )}
                {student.parent_name && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Parent:</span> {student.parent_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

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
          <button onClick={() => navigate(`${createPageUrl('StudentProgress')}?studentId=${studentId}&classId=${classId}`)
          }
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-emerald-300 hover:shadow-sm transition-all text-left">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Progress</p>
              <p className="text-xs text-slate-500">Marks & rank</p>
            </div>
          </button>
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

        {/* Upcoming Homework */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookCopy className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">Upcoming Homework</h3>
          </div>
          {homework.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">No upcoming homework</p>
          ) : (
            <div className="space-y-2">
              {homework.map((hw, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">
                        {hw.subject}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate">{hw.title}</span>
                    </div>
                    {hw.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{hw.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${getDueColor(hw.due_date)}`}>
                    {formatDueDate(hw.due_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Timetable */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">Today's Timetable</h3>
            <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {todayLabel}
            </span>
          </div>
          {new Date().getDay() === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">🎉 No school today — enjoy the weekend!</p>
          ) : todayPeriods.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">Timetable not set up yet by teacher</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {todayPeriods.map((subject, i) => (
                <div key={i} className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-indigo-400 w-5 shrink-0">{i + 1}</span>
                  <span className="text-sm font-semibold text-indigo-800 truncate">{subject}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Announcements</h3>
          </div>
          {announcements.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">No announcements</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a, i) => (
                <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{a.title}</p>
                    <span className="text-xs text-slate-400 shrink-0">{formatAnnTime(a.created_at)}</span>
                  </div>
                  {a.body && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Diary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">Today's Diary</h3>
            <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Today
            </span>
          </div>
          {todayDiary.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">No diary entries for today yet</p>
          ) : (
            <div className="space-y-3">
              {todayDiary.map((entry, i) => (
                <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {entry.subject}
                  </span>
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exam Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">Upcoming Exams</h3>
          </div>
          {/* Daily quote */}
          <p className="text-[11px] italic text-slate-400 mb-4 leading-relaxed">"{todayQuote}"</p>
          {examSchedule.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">No upcoming exams scheduled</p>
          ) : (
            <div className="space-y-2">
              {examSchedule.map((e, i) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const days = Math.round((new Date(e.date + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className={`shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white font-bold text-xs ${
                      days === 0 ? 'bg-red-500' : days <= 3 ? 'bg-orange-500' : 'bg-indigo-500'
                    }`}>
                      <span className="text-base font-extrabold leading-none">{days === 0 ? '!' : days}</span>
                      <span className="text-[9px] opacity-80">{days === 0 ? 'today' : 'days'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{e.subject}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{e.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {e.notes ? ` · ${e.notes}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Add Another Child</h2>
              <button onClick={() => setShowAddChild(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500">Enter your other child's student code</p>
            {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-500" />
                Student Code
              </label>
              <input
                type="text"
                value={addCode}
                onChange={e => {
                  const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                  setAddCode(raw.length > 4 ? `${raw.slice(0,4)}-${raw.slice(4)}` : raw);
                  setAddError('');
                }}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.25em] uppercase placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddChild(false)}
                className="flex-1 border border-slate-300 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleAddChild} disabled={addLoading || addCode.replace('-','').length < 8}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addLoading ? 'Verifying...' : 'Add Child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
