import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';
import {
  getStudentsByClass, getAttendanceByClassInYear,
  getExamsByClass, getMarksByStudent, getMarksByExams, getClassById,
  getSchoolById, getAcademicYearDates,
} from '@/lib/db';
import { ArrowLeft, Loader2, Printer, GraduationCap, Award } from 'lucide-react';

const gradeFromPct = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
};

const gradeRemarks = (grade) => {
  const rem = {
    'A+': 'Outstanding Performance',
    'A': 'Excellent Work',
    'B+': 'Very Good',
    'B': 'Good Progress',
    'C': 'Satisfactory',
    'D': 'Needs Improvement',
    'F': 'Fail',
  };
  return rem[grade] || '';
};

function Detail({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-900 border-b border-slate-300 pb-1 mt-1">{value}</span>
    </div>
  );
}

function ReportCardContent() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('studentId');
  const classId = params.get('classId');

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [yearLabel, setYearLabel] = useState('');
  const [rank, setRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!studentId || !classId) { navigate(-1); return; }
    try {
      const [students, cls] = await Promise.all([
        getStudentsByClass(classId),
        getClassById(classId),
      ]);
      setStudent(students.find(s => s.id === studentId) || null);
      setClassInfo(cls);

      const school = cls?.school_id ? await getSchoolById(cls.school_id).catch(() => null) : null;
      setSchoolInfo(school);
      
      const { start, end, label } = getAcademicYearDates(school);
      setYearLabel(label);

      const [att, examList, studentMarks] = await Promise.all([
        getAttendanceByClassInYear(classId, start, end),
        getExamsByClass(classId),
        getMarksByStudent(studentId),
      ]);
      setAttendance(att.filter(r => r.student_id === studentId));
      setExams(examList);
      setMarks(studentMarks);
      setTotalStudents(students.length);

      // Calculate class rank
      const examIds = examList.map(e => e.id);
      if (examIds.length && students.length) {
        const allMarks = await getMarksByExams(examIds);
        const scores = students.map(s => {
          let obt = 0, mx = 0;
          examList.forEach(e => {
            const m = allMarks.find(mk => mk.exam_id === e.id && mk.student_id === s.id);
            if (m) { obt += Number(m.marks_obtained); mx += Number(e.max_marks) || 100; }
          });
          return { id: s.id, pct: mx > 0 ? obt / mx : 0 };
        });
        scores.sort((a, b) => b.pct - a.pct);
        const r = scores.findIndex(s => s.id === studentId) + 1;
        if (r > 0) setRank(r);
      }
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
  const overallGrade = overallPct !== null ? gradeFromPct(overallPct) : '—';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-slate-500 font-medium">Student not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:py-0 print:bg-white flex flex-col items-center">
      {/* Toolbar — hidden when printing */}
      <header className="w-[210mm] max-w-full bg-white border border-slate-300 rounded-lg shadow-sm mb-6 px-4 py-3 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print A4 Format
        </button>
      </header>

      {/* A4 Document Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none relative overflow-hidden text-slate-900 border border-slate-200 print:border-none print:w-auto print:min-h-0 mx-auto">
        
        {/* Decorative Borders */}
        <div className="absolute inset-0 border-[12px] border-double border-slate-800 m-4 pointer-events-none z-10 opacity-10 print:opacity-100 print:border-slate-800"></div>
        <div className="absolute inset-0 border-2 border-solid border-amber-500 m-[22px] pointer-events-none z-10 opacity-30 print:opacity-100"></div>

        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
           <GraduationCap className="w-96 h-96" />
        </div>

        {/* Main Content Area */}
        <div className="relative z-20 px-16 py-16">
          
          {/* Header Section */}
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-md border-4 border-amber-500">
                <GraduationCap className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-slate-900 mb-2">
              {schoolInfo?.name || 'EduSphere Academy'}
            </h1>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-widest mb-4">
              Excellence in Education
            </p>
            <div className="inline-block bg-slate-100 border border-slate-300 px-6 py-2 rounded-full">
              <h2 className="text-lg font-bold text-slate-800 tracking-wide">
                OFFICIAL REPORT CARD
              </h2>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4">
              Academic Year {yearLabel ? yearLabel : '2023-2024'}
            </p>
          </div>

          {/* Student Details Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10 bg-slate-50 border border-slate-200 p-6 rounded-lg">
            <Detail label="Student Name" value={student.name || '—'} />
            <Detail label="Class & Section" value={`${classInfo?.name || '—'}${classInfo?.section ? ' - ' + classInfo.section : ''}`} />
            <Detail label="Roll Number" value={student.roll_number || '—'} />
            <Detail label="Admission Number" value={student.admission_number || '—'} />
            <Detail label="Parent / Guardian" value={student.parent_name || '—'} />
            <Detail label="Date of Issue" value={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>

          {/* Academic Performance */}
          <div className="mb-10">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider border-b-2 border-amber-500 pb-2 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Scholastic Performance
            </h3>
            
            {marksRows.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 p-8 text-center text-slate-500 italic">
                No examination records available for this term.
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider border border-slate-800">Examination / Subject</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider border border-slate-800 w-24">Max</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider border border-slate-800 w-24">Obt.</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider border border-slate-800 w-20">%</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider border border-slate-800 w-24">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {marksRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-3 px-4 font-semibold text-slate-800 border border-slate-300">
                        {row.exam.name}
                        {row.exam.subject && <span className="block text-xs font-normal text-slate-500">{row.exam.subject}</span>}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 border border-slate-300">{row.max}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 border border-slate-300">{row.obtained}</td>
                      <td className="py-3 px-4 text-center text-slate-600 border border-slate-300 font-mono">{row.pct}%</td>
                      <td className="py-3 px-4 text-center font-black border border-slate-300 text-slate-800">{row.grade}</td>
                    </tr>
                  ))}
                </tbody>
                {marksRows.length > 1 && totalMax > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-[3px] border-slate-800">
                      <td className="py-4 px-4 text-right uppercase tracking-wider text-slate-900 border border-slate-300">Grand Total</td>
                      <td className="py-4 px-4 text-center text-slate-900 border border-slate-300">{totalMax}</td>
                      <td className="py-4 px-4 text-center text-slate-900 border border-slate-300">{totalObtained}</td>
                      <td className="py-4 px-4 text-center text-slate-900 border border-slate-300 font-mono">{overallPct}%</td>
                      <td className="py-4 px-4 text-center text-slate-900 border border-slate-300 text-lg">{overallGrade}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
             {/* Attendance Summary */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-2 mb-4">
                Attendance Record
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Total School Days</span>
                  <span className="font-bold text-slate-900">{attTotal}</span>
                </div>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Days Present</span>
                  <span className="font-bold text-slate-900">{attPresent + attLate}</span>
                </div>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Days Absent</span>
                  <span className="font-bold text-slate-900">{attAbsent}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Percentage</span>
                  <span className="font-black text-slate-900 text-lg">{attPct !== null ? `${attPct}%` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Remarks & Rank */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-2 mb-4">
                Overall Assessment
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg h-full">
                 <div className="mb-4">
                   <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Class Rank</p>
                   {rank ? (
                     <p className="text-xl font-black text-slate-900">#{rank} <span className="text-sm font-medium text-slate-500">out of {totalStudents}</span></p>
                   ) : (
                     <p className="font-semibold text-slate-700">—</p>
                   )}
                 </div>
                 <div>
                   <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Teacher's Remarks</p>
                   <p className="font-semibold text-slate-800 italic">
                     {overallPct !== null ? gradeRemarks(overallGrade) : 'Evaluation Pending'}
                   </p>
                 </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-20 pt-16 grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="border-t border-slate-800 mx-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-3">Class Teacher</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-800 mx-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-3">Parent / Guardian</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-800 mx-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-3">Principal</p>
            </div>
          </div>

        </div>
      </div>
      
      {/* Hide the sidebar when printing, ensure A4 dimensions */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          /* Hide the AppLayout sidebar */
          aside, nav { display: none !important; }
          /* Force main content to take full width */
          main { margin-left: 0 !important; padding: 0 !important; width: 100% !important; }
          /* Remove layout backgrounds */
          #root > div > div, #root > div > main { background: white !important; }
        }
      `}</style>
    </div>
  );
}

export default function ReportCard() {
  return (
    <AppLayout title="Report Card">
      <ReportCardContent />
    </AppLayout>
  );
}
