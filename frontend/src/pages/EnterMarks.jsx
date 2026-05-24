import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  getTeacherByUserId,
  getClasses,
  getExamsByClass,
  getStudentsByClass,
  getMarksByExam,
  saveMarks,
} from '@/lib/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Save, Loader2, ChevronLeft } from 'lucide-react';

const EXAM_TYPES = [
  { key: 'UT', label: 'Unit Test', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  { key: 'Periodic Test', label: 'Periodic Test', color: 'bg-pink-500', light: 'bg-pink-50 border-pink-200', text: 'text-pink-700' },
  { key: 'Half Yearly', label: 'Half Yearly', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { key: 'Annual', label: 'Annual', color: 'bg-green-500', light: 'bg-green-50 border-green-200', text: 'text-green-700' },
  { key: 'Other', label: 'Other', color: 'bg-slate-500', light: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
];

export default function EnterMarks() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);

  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!isLoadingAuth) loadInitial(authUser);
  }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (selectedClass) loadExamsAndStudents(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedExam) loadExistingMarks(selectedExam.id);
  }, [selectedExam]);

  const loadInitial = async (user) => {
    try {
      if (!user) { navigate(createPageUrl('Login')); return; }

      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) { navigate(createPageUrl('JoinSchool')); return; }
      setTeacher(teacherData);

      const allClasses = await getClasses(teacherData.school_id);
      const teacherClasses = allClasses.filter(c =>
        (teacherData.assigned_classes || []).includes(c.id)
      );
      setClasses(teacherClasses);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadExamsAndStudents = async (classId) => {
    try {
      const [examsData, studentsData] = await Promise.all([
        getExamsByClass(classId),
        getStudentsByClass(classId),
      ]);
      setExams(examsData);
      setStudents(studentsData);
    } catch (err) {
      console.error(err);
    }
  };

  const loadExistingMarks = async (examId) => {
    try {
      const marksData = await getMarksByExam(examId);
      const map = {};
      marksData.forEach(m => { map[m.student_id] = m.marks_obtained; });
      setMarks(map);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedType(null);
    setSelectedExam(null);
    setMarks({});
    setStep(1);
  };

  const handleTypeSelect = (typeObj) => {
    setSelectedType(typeObj);
    setSelectedExam(null);
    setMarks({});
    setStep(2);
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setSelectedExam(null);
      setMarks({});
      setStep(2);
    } else if (step === 2) {
      setSelectedType(null);
      setStep(1);
    } else {
      navigate(createPageUrl('TeacherDashboard'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = students
        .filter(s => marks[s.id] !== undefined && marks[s.id] !== '')
        .map(s => ({
          exam_id: selectedExam.id,
          student_id: s.id,
          school_id: teacher.school_id,
          marks_obtained: Number(marks[s.id]),
        }));

      if (records.length === 0) {
        showToast('No marks entered', 'error');
        setSaving(false);
        return;
      }

      await saveMarks(records);
      showToast('Marks saved successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to save marks', 'error');
    }
    setSaving(false);
  };

  const getExamsByType = (typeKey) => exams.filter(e => e.type === typeKey);

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '';
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Back to Dashboard' : 'Back'}
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-xl font-bold text-slate-800">Enter Marks</h1>
        </div>

        {/* Class Selector — always visible */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Class</label>
          <select
            value={selectedClass}
            onChange={e => handleClassChange(e.target.value)}
            className="w-full max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">Choose a class…</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}{cls.section ? ' - ' + cls.section : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Step 1 — Exam Type Cards */}
        {selectedClass && step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Select Exam Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {EXAM_TYPES.map(typeObj => {
                const count = getExamsByType(typeObj.key).length;
                return (
                  <button
                    key={typeObj.key}
                    onClick={() => handleTypeSelect(typeObj)}
                    disabled={count === 0}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all
                      ${count === 0 ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' : `${typeObj.light} border-current hover:scale-105`}
                    `}
                  >
                    <div className={`w-10 h-10 ${typeObj.color} rounded-full mb-3`} />
                    <p className={`text-sm font-bold ${count === 0 ? 'text-slate-400' : typeObj.text}`}>{typeObj.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{count} exam{count !== 1 ? 's' : ''}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Exam List */}
        {selectedClass && step === 2 && selectedType && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Select {selectedType.label} Exam
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {getExamsByType(selectedType.key).map(exam => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam)}
                  className="text-left p-4 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <p className="font-bold text-purple-700 text-sm">{exam.subject}</p>
                  <p className="text-slate-600 text-sm mt-0.5">{exam.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>Max Marks: {exam.max_marks}</span>
                    {exam.exam_date && (
                      <span>Date: {new Date(exam.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Marks Entry */}
        {selectedClass && step === 3 && selectedExam && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Exam header */}
            <div className="px-5 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-purple-900">{selectedExam.subject} — {selectedExam.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Max Marks: {selectedExam.max_marks}</p>
              </div>
              <span className="text-xs bg-purple-200 text-purple-800 px-2.5 py-1 rounded-full font-medium">
                {getClassName(selectedClass)}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Roll No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                      Marks Obtained (Out of {selectedExam.max_marks})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        No students in this class.
                      </td>
                    </tr>
                  ) : (
                    students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{student.roll_number || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={selectedExam.max_marks}
                            placeholder="Enter marks"
                            value={marks[student.id] ?? ''}
                            onChange={e => setMarks({ ...marks, [student.id]: e.target.value })}
                            className="w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Marks'}
              </button>
            </div>
          </div>
        )}

        {/* Empty state for class with no exams */}
        {selectedClass && step === 1 && exams.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No exams found for this class. Ask your principal to create exams first.
          </div>
        )}
      </div>
    </div>
  );
}
