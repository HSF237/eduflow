import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStudentsByClass, getAttendanceByClass,
  getExamsByClass, getMarksByStudent, getClassById,
} from '@/lib/db';
import { ArrowLeft, Loader2, Printer, GraduationCap } from 'lucide-react';

const gradeFromPct = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
};

function Detail({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 font-semibold">{label}: </span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

function AttBox({ label, value, color }) {
  return (
    <div>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function ReportCard() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('studentId');
  const classId = params.get('classId');

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!studentId || !classId) { navigate(-1); return; }
    try {
      const [students, cls, att, examList, studentMarks] = await Promise.all([
        getStudentsByClass(classId),
        getClassById(classId),
        getAttendanceByClass(classId),
        getExamsByClass(classId),
        getMarksByStudent(studentId),
      ]);
      setStudent(students.find(s => s.id === studentId) || null);
      setClassInfo(cls);
      setAttendance(att.filter(r => r.student_id === studentId));
      setExams(examList);
      setMarks(studentMarks);
    } catch (err) {
      console.error('ReportCard load error:', err);
    }
    setLoading(false);
  };

  const attTotal = attendance.length;
  const attPresent = attendance.filter(r => ['present', 'Present'].includes(r.status)).length;
  const attLate = attendance.filter(r => ['late', 'Late'].includes(r.status)).length;
  const attAbsent = attendance.filter(r => ['absent', 'Absent'].includes(r.status)).length;
  const attPct = attTotal > 0 ? Math.round(((attPresent + attLate) / attTotal) * 100) : null;

  const marksMap = {};
  marks.forEach(m => { marksMap[m.exam_id] = m; });

  const marksRows = exams
    .map(exam => {
      const m = marksMap[exam.id];
      const obtained = m ? Number(m.marks_obtained) : null;
      const max = Number(exam.max_marks) || 100;
      const pct = obtained !== null ? Math.round((obtained / max) * 100) : null;
      return { exam, obtained, max, pct, grade: pct !== null ? gradeFromPct(pct) : '—' };
    })
    .filter(r => r.obtained !== null);

  const totalObtained = marksRows.reduce((s, r) => s + (r.obtained || 0), 0);
  const totalMax = marksRows.reduce((s, r) => s + r.max, 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Student not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h1 className="font-bold text-slate-800 flex-1">Report Card</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">

          {/* Report header */}
          <div className="bg-blue-700 text-white px-8 py-6 text-center">
            <div className="flex justify-center mb-2">
              <GraduationCap className="w-10 h-10 opacity-90" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide">STUDENT REPORT CARD</h1>
            <p className="text-blue-200 text-sm mt-1">Academic Progress Report</p>
          </div>

          {/* Student details */}
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              <Detail label="Student Name" value={student.name} />
              <Detail label="Class"
                value={`${classInfo?.name || '—'}${classInfo?.section ? ' – ' + classInfo.section : ''}`} />
              <Detail label="Roll Number" value={student.roll_number || '—'} />
              <Detail label="Admission No." value={student.admission_number || '—'} />
              {student.parent_name && <Detail label="Parent Name" value={student.parent_name} />}
              <Detail label="Date Printed"
                value={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* Marks table */}
          <div className="px-8 py-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Examination Results</h2>
            {marksRows.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No exam marks recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      {['Exam', 'Subject', 'Max', 'Obtained', '%', 'Grade'].map(h => (
                        <th key={h} className={`py-2 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                          h === 'Exam' || h === 'Subject' ? 'text-left pr-4' : 'text-center px-2'
                        }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {marksRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-800">{row.exam.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{row.exam.subject || '—'}</td>
                        <td className="py-3 px-2 text-center text-slate-600">{row.max}</td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-800">{row.obtained}</td>
                        <td className="py-3 px-2 text-center text-slate-600">{row.pct}%</td>
                        <td className="py-3 pl-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            ['A+', 'A'].includes(row.grade) ? 'bg-green-100 text-green-700' :
                            ['B+', 'B'].includes(row.grade) ? 'bg-blue-100 text-blue-700' :
                            row.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                            row.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>{row.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {marksRows.length > 1 && totalMax > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td colSpan={2} className="py-3 pr-4 font-bold text-slate-800">TOTAL</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{totalMax}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{totalObtained}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{overallPct}%</td>
                        <td className="py-3 pl-2 text-center">
                          {overallPct !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              overallPct >= 80 ? 'bg-green-100 text-green-700' :
                              overallPct >= 60 ? 'bg-blue-100 text-blue-700' :
                              overallPct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{gradeFromPct(overallPct)}</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Attendance summary */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <AttBox label="Total Days" value={attTotal} color="text-slate-800" />
              <AttBox label="Present" value={attPresent} color="text-green-600" />
              <AttBox label="Absent" value={attAbsent} color="text-red-600" />
              <AttBox label="Late" value={attLate} color="text-orange-600" />
            </div>
            {attPct !== null && (
              <div className="mt-4 text-center">
                <span className="text-sm text-slate-600">Attendance Percentage: </span>
                <span className={`text-sm font-bold ${
                  attPct >= 75 ? 'text-green-600' : attPct >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>{attPct}%</span>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="px-8 py-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-slate-400 mt-10 pt-2 text-xs text-slate-500">
                Class Teacher Signature
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 mt-10 pt-2 text-xs text-slate-500">
                Principal Signature
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
