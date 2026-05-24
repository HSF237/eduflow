import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClassById, getStudentsByClass, getAttendanceByClassAndDate, saveAttendance } from '@/lib/db';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const STATUSES = ['present', 'absent', 'late'];

const STATUS_STYLE = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  absent: 'bg-red-100 text-red-700 border-red-300',
  late: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

export default function EditAttendance() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const classId = params.get('classId');
  const date = params.get('date');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (!classId || !date) { navigate(-1); return; }
      const [cls, studs, existing] = await Promise.all([
        getClassById(classId),
        getStudentsByClass(classId),
        getAttendanceByClassAndDate(classId, date),
      ]);
      setClassInfo(cls);
      setStudents(studs);
      const map = {};
      studs.forEach(s => {
        const rec = existing.find(a => a.student_id === s.id);
        map[s.id] = (rec?.status || 'present').toLowerCase();
      });
      setStatusMap(map);
    } catch (err) {
      console.error('EditAttendance error:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        class_id: classId,
        school_id: classInfo?.school_id || '',
        date,
        status: statusMap[s.id] || 'present',
      }));
      await saveAttendance(records);
      navigate(-1);
    } catch (err) {
      console.error('EditAttendance save error:', err);
      alert('Failed to save. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div>
              <h1 className="font-bold text-slate-800">Edit Attendance</h1>
              <p className="text-xs text-slate-500">
                {classInfo?.name}{classInfo?.section ? ` — ${classInfo.section}` : ''} &bull; {date}
              </p>
            </div>
          </div>
          <button onClick={handleSave} disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-3">
        {students
          .slice()
          .sort((a, b) => (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0))
          .map(student => (
            <div key={student.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="font-bold text-slate-600">{student.roll_number}</span>
                </div>
                <p className="font-medium text-slate-800">{student.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map(s => (
                  <button key={s}
                    onClick={() => setStatusMap(prev => ({ ...prev, [student.id]: s }))}
                    className={`py-2 rounded-lg text-sm font-medium border-2 capitalize transition-all ${
                      statusMap[student.id] === s
                        ? STATUS_STYLE[s]
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}

        {students.length === 0 && (
          <div className="text-center py-12 text-slate-400">No students found in this class.</div>
        )}
      </main>
    </div>
  );
}
