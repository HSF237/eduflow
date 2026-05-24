import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getClassById, getStudentsByClass, getAttendanceByClassInYear,
  getSchoolById, getAcademicYearDates, updateStudent, generateParentCode,
} from '@/lib/db';
import { ArrowLeft, Loader2, Users, Search, Copy, Check, KeyRound, RefreshCw, Share2, FileText } from 'lucide-react';

export default function ViewStudents() {
  const navigate = useNavigate();
  const classId = new URLSearchParams(window.location.search).get('classId');

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (!classId) { navigate(createPageUrl('TeacherDashboard')); return; }
      const [cls, studs] = await Promise.all([
        getClassById(classId),
        getStudentsByClass(classId),
      ]);
      setClassInfo(cls);
      setStudents(studs);
      const school = cls?.school_id ? await getSchoolById(cls.school_id).catch(() => null) : null;
      const { start, end } = getAcademicYearDates(school);
      const att = await getAttendanceByClassInYear(classId, start, end);
      setAttendance(att);
    } catch (err) {
      console.error('ViewStudents error:', err);
    }
    setLoading(false);
  };

  const getAttendancePct = (studentId) => {
    const recs = attendance.filter(a => a.student_id === studentId);
    if (!recs.length) return 100;
    const present = recs.filter(a => ['present', 'Present', 'late', 'Late'].includes(a.status)).length;
    return Math.round((present / recs.length) * 100);
  };

  const getBadgeColor = (pct) =>
    pct >= 75 ? 'bg-emerald-100 text-emerald-700' :
    pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  const getSituation = (pct) =>
    pct >= 75 ? { label: 'Good', color: 'bg-emerald-500' } :
    pct >= 50 ? { label: 'Average', color: 'bg-yellow-500' } :
    { label: 'At Risk', color: 'bg-red-500' };

  const copyCode = (student) => {
    if (!student.parent_code) return;
    navigator.clipboard.writeText(student.parent_code);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWhatsApp = (student) => {
    const code = student.parent_code;
    if (!code) return;
    const msg = `Hello!\n\nParent login code for *${student.name}*:\n\n🔑 Code: *${code}*\n\nVisit: ${window.location.origin}/parentlogin\nEnter this code to view your child's attendance & progress.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const regenerateCode = async (student) => {
    if (!window.confirm(`Generate a new code for ${student.name}? The old code will stop working.`)) return;
    setRegeneratingId(student.id);
    try {
      const newCode = generateParentCode();
      await updateStudent(student.id, { parent_code: newCode });
      await loadData();
    } catch (err) {
      console.error('Error regenerating code:', err);
    }
    setRegeneratingId(null);
  };

  const filtered = students
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.roll_number).includes(searchTerm))
    .sort((a, b) => (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="font-bold text-slate-800">Students</h1>
            <p className="text-xs text-slate-500">
              {classInfo?.name}{classInfo?.section ? ` — Section ${classInfo.section}` : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search by name or roll number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Student list */}
        <div className="space-y-3">
          {filtered.map(student => {
            const pct = getAttendancePct(student.id);
            const sit = getSituation(pct);
            const eng = student.engagement_score ?? 100;
            const isCopied = copiedId === student.id;
            const isRegen = regeneratingId === student.id;

            return (
              <div key={student.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                {/* Student info row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="font-bold text-slate-600 text-lg">{student.roll_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                    {student.parent_name && <p className="text-xs text-slate-400">Parent: {student.parent_name}</p>}
                    <span className={`inline-block mt-1 text-xs font-semibold text-white px-2 py-0.5 rounded-full ${sit.color}`}>
                      {sit.label}
                    </span>
                  </div>
                </div>

                {/* Attendance + Engagement */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Attendance</p>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getBadgeColor(pct)}`}>{pct}%</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Engagement</p>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getBadgeColor(eng)}`}>{eng}</span>
                  </div>
                </div>

                {/* Report card link */}
                <button
                  onClick={() => navigate(`${createPageUrl('ReportCard')}?studentId=${student.id}&classId=${classId}`)}
                  className="w-full flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-xs font-semibold transition-colors mb-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Report Card
                </button>

                {/* Parent code row */}
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-xs text-purple-500 font-medium shrink-0">Parent Code:</span>
                  <span className="font-mono font-bold text-purple-700 tracking-widest text-sm flex-1">
                    {student.parent_code || '—'}
                  </span>
                  {student.parent_code ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => copyCode(student)} title="Copy code"
                        className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                        {isCopied
                          ? <Check className="w-3.5 h-3.5 text-green-600" />
                          : <Copy className="w-3.5 h-3.5 text-purple-500" />}
                      </button>
                      <button onClick={() => shareWhatsApp(student)} title="Share on WhatsApp"
                        className="p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                        <Share2 className="w-3.5 h-3.5 text-green-600" />
                      </button>
                      <button onClick={() => regenerateCode(student)} title="New code" disabled={isRegen}
                        className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRegen ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => regenerateCode(student)}
                      className="text-xs text-purple-600 hover:underline shrink-0">
                      Generate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No students found</p>
          </div>
        )}
      </main>
    </div>
  );
}
