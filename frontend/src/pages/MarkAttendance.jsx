import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import {
  getStudentsByClass,
  getAttendanceByClassAndDate,
  saveAttendance,
  getClassById,
} from '@/lib/db';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Save, CheckCircle, Loader2,
} from 'lucide-react';

const STATUSES = ['Present', 'Absent', 'Late', 'Half-day'];

const STATUS_STYLES = {
  Present:  { active: 'bg-green-500 text-white border-green-500',  inactive: 'border-slate-300 text-slate-600 bg-white hover:bg-green-50' },
  Absent:   { active: 'bg-red-500 text-white border-red-500',      inactive: 'border-slate-300 text-slate-600 bg-white hover:bg-red-50' },
  Late:     { active: 'bg-yellow-400 text-white border-yellow-400', inactive: 'border-slate-300 text-slate-600 bg-white hover:bg-yellow-50' },
  'Half-day': { active: 'bg-blue-500 text-white border-blue-500',  inactive: 'border-slate-300 text-slate-600 bg-white hover:bg-blue-50' },
};

const COUNTER_STYLES = {
  Present:    { bg: 'bg-green-50',  text: 'text-green-600',  label: 'text-green-700' },
  Absent:     { bg: 'bg-red-50',    text: 'text-red-600',    label: 'text-red-700'   },
  Late:       { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'text-yellow-700' },
  'Half-day': { bg: 'bg-blue-50',   text: 'text-blue-600',   label: 'text-blue-700'  },
};

export default function MarkAttendance() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [attendance, setAttendance] = useState({}); // { studentId: status }
  const [markedBy, setMarkedBy] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    if (!classId) {
      navigate(createPageUrl('TeacherDashboard'));
      return;
    }
    loadData();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (authUser) setMarkedBy(authUser.email || authUser.uid);

      const cls = await getClassById(classId);
      setClassInfo(cls || null);

      const [studs, existingAtt] = await Promise.all([
        getStudentsByClass(classId),
        getAttendanceByClassAndDate(classId, today),
      ]);

      setStudents(studs);

      // Pre-fill from existing records, default to Present
      const init = {};
      studs.forEach((s) => {
        const rec = existingAtt.find((a) => a.student_id === s.id);
        init[s.id] = rec?.status
          ? capitalise(rec.status)
          : 'Present';
      });
      setAttendance(init);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const capitalise = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const setStatus = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const next = {};
    students.forEach((s) => { next[s.id] = 'Present'; });
    setAttendance(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const schoolId = classInfo?.school_id;

      const records = students.map((s) => ({
        school_id: schoolId,
        class_id: classId,
        student_id: s.id,
        date: today,
        status: (attendance[s.id] || 'Present').toLowerCase(),
        marked_by: markedBy,
      }));

      await saveAttendance(records);
      navigate(createPageUrl('TeacherDashboard'));
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance. Please try again.');
    }
    setSaving(false);
  };

  // Counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = Object.values(attendance).filter((v) => v === s).length;
    return acc;
  }, {});

  // Score for a student (use engagement_score as proxy for attendance %)
  const getScore = (student) => student.engagement_score ?? 100;

  const className = classInfo
    ? `${classInfo.name}${classInfo.section ? ' - ' + classInfo.section : ''}`
    : '—';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── STICKY HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">
                Mark Attendance
              </h1>
              <p className="text-xs text-slate-500 leading-tight">
                Class {className} &bull; {todayDisplay}
              </p>
            </div>
          </div>

          {/* Right */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ── MINI STAT COUNTERS ── */}
        <div className="grid grid-cols-4 gap-3">
          {STATUSES.map((s) => {
            const style = COUNTER_STYLES[s];
            return (
              <div
                key={s}
                className={`${style.bg} rounded-xl p-3 text-center`}
              >
                <p className={`text-2xl font-extrabold ${style.text}`}>
                  {counts[s]}
                </p>
                <p className={`text-xs font-medium ${style.label}`}>{s}</p>
              </div>
            );
          })}
        </div>

        {/* ── MARK ALL PRESENT ── */}
        <div>
          <button
            onClick={markAllPresent}
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Mark All Present
          </button>
        </div>

        {/* ── STUDENT LIST ── */}
        <div className="space-y-3">
          {students.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No students in this class.
            </div>
          )}

          {students.map((student) => {
            const currentStatus = attendance[student.id] || 'Present';
            const score = getScore(student);
            const isSet = !!attendance[student.id];

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3"
              >
                {/* Top row: roll + name + checkmark */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="min-w-[36px] h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-600">
                      {student.roll_number || '—'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                      score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {score}%
                    </span>
                  </div>
                  {isSet && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                </div>
                {/* Status buttons — full width grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUSES.map((s) => {
                    const style = STATUS_STYLES[s];
                    const isActive = currentStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(student.id, s)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                          isActive ? style.active : style.inactive
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
