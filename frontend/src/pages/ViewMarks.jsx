import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getStudentsByClass, getMarksByStudent } from '@/lib/db';
import { ArrowLeft, BookOpen, ClipboardList, Award, Loader2 } from 'lucide-react';

function getPerformanceColor(pct) {
  if (pct >= 75) return 'bg-green-100 text-green-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function StudentMarksCard({ student }) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarksByStudent(student.id)
      .then(setMarks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [student.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading marks for {student.name}...</span>
        </div>
      </div>
    );
  }

  // Compute stats
  let totalObtained = 0;
  let totalMax = 0;
  const subjectStats = {};
  const typeStats = {};

  marks.forEach(mark => {
    const exam = mark.exams;
    if (!exam) return;

    const obtained = mark.marks_obtained || 0;
    const max = exam.max_marks || 0;

    totalObtained += obtained;
    totalMax += max;

    if (!subjectStats[exam.subject]) subjectStats[exam.subject] = { obtained: 0, max: 0 };
    subjectStats[exam.subject].obtained += obtained;
    subjectStats[exam.subject].max += max;

    if (!typeStats[exam.type]) typeStats[exam.type] = { obtained: 0, max: 0 };
    typeStats[exam.type].obtained += obtained;
    typeStats[exam.type].max += max;
  });

  const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
          <p className="text-sm text-slate-400">Roll: {student.roll_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-purple-500" />
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-600 leading-none">{overallPct}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Overall Performance</p>
          </div>
        </div>
      </div>

      {/* Subject + Type grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {/* Subject-wise */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-slate-700">Subject-wise Performance</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(subjectStats).length === 0 ? (
              <p className="text-xs text-slate-400">No data available</p>
            ) : (
              Object.entries(subjectStats).map(([subject, data]) => {
                const pct = data.max > 0 ? ((data.obtained / data.max) * 100).toFixed(1) : 0;
                return (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 font-medium">{subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{data.obtained}/{data.max}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPerformanceColor(Number(pct))}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Exam-type-wise */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-slate-700">Exam Type Performance</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(typeStats).length === 0 ? (
              <p className="text-xs text-slate-400">No data available</p>
            ) : (
              Object.entries(typeStats).map(([type, data]) => {
                const pct = data.max > 0 ? ((data.obtained / data.max) * 100).toFixed(1) : 0;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{data.obtained}/{data.max}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPerformanceColor(Number(pct))}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Total row */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <span className="font-semibold text-slate-600 text-sm">Total Marks</span>
        <span className="font-bold text-slate-800 text-lg">{totalObtained} / {totalMax}</span>
      </div>
    </div>
  );
}

export default function ViewMarks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const classId = localStorage.getItem('parent_class_id');
  const selectedStudentId = localStorage.getItem('parent_student_id');

  useEffect(() => {
    if (!classId) {
      navigate(createPageUrl('ParentLogin'));
      return;
    }
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const all = await getStudentsByClass(classId);
      // Show only the selected student if one is stored
      if (selectedStudentId) {
        const found = all.find(s => s.id === selectedStudentId);
        setStudents(found ? [found] : all);
      } else {
        setStudents(all);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <button
            onClick={() => navigate(createPageUrl('ParentDashboard'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">View Marks</h1>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
            No students found.
          </div>
        ) : (
          students.map(student => (
            <StudentMarksCard key={student.id} student={student} />
          ))
        )}
      </main>
    </div>
  );
}
