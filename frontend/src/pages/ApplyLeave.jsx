import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getClassById, getStudentsByClass, getLeavesByClass, createLeaveRequest } from '@/lib/db';
import { ArrowLeft, Loader2, Send, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const statusColor = (s) => {
  if (s === 'approved') return 'bg-green-100 text-green-800';
  if (s === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const statusIcon = (s) => {
  if (s === 'approved') return <CheckCircle className="w-3.5 h-3.5" />;
  if (s === 'rejected') return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

export default function ApplyLeave() {
  const navigate = useNavigate();
  const classId = localStorage.getItem('parent_class_id');
  const parentStudentId = localStorage.getItem('parent_student_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ student_id: '', from_date: '', to_date: '', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!classId) { navigate(createPageUrl('ParentLogin')); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cls, studs, leavesData] = await Promise.all([
        getClassById(classId),
        getStudentsByClass(classId),
        getLeavesByClass(classId),
      ]);
      setClassInfo(cls);
      const sorted = studs.slice().sort((a, b) => (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0));
      setStudents(sorted);
      setLeaves(leavesData.slice().sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      const defaultStudent = parentStudentId || (sorted.length === 1 ? sorted[0].id : '');
      setForm(f => ({ ...f, student_id: defaultStudent }));
    } catch (err) {
      console.error('ApplyLeave error:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (new Date(form.to_date) < new Date(form.from_date)) {
      setError('End date cannot be before start date'); return;
    }
    const student = students.find(s => s.id === form.student_id);
    if (!student) { setError('Please select a student'); return; }
    setSubmitting(true);
    try {
      await createLeaveRequest({
        school_id: classInfo?.school_id || '',
        class_id: classId,
        student_id: form.student_id,
        student_name: student.name,
        from_date: form.from_date,
        to_date: form.to_date,
        reason: form.reason,
        status: 'pending',
      });
      setSuccess('Leave application submitted successfully!');
      setForm({ student_id: form.student_id, from_date: '', to_date: '', reason: '' });
      const updated = await getLeavesByClass(classId);
      setLeaves(updated.slice().sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
    } catch (err) {
      console.error('ApplyLeave submit error:', err);
      setError('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  const myLeaves = parentStudentId
    ? leaves.filter(l => l.student_id === parentStudentId)
    : leaves;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-bold text-lg text-slate-800">Apply for Leave</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-slate-800">New Application</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

              {parentStudentId ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                  <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-medium">
                    {students.find(s => s.id === parentStudentId)?.name || localStorage.getItem('parent_student_name') || 'Your child'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                  <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Select student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Roll: {s.roll_number})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input type="date" value={form.from_date} required
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, from_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input type="date" value={form.to_date} required
                    min={form.from_date || new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, to_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea value={form.reason} required rows={4}
                  placeholder="Please provide a reason for the leave..."
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Application
              </button>
            </form>
          </div>

          {/* History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-slate-500" />
              <h2 className="font-semibold text-slate-800">Leave History</h2>
            </div>
            {myLeaves.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>No leave applications yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {myLeaves.map(app => (
                  <div key={app.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{app.student_name}</p>
                        <p className="text-xs text-slate-500">{app.from_date} — {app.to_date}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(app.status || 'pending')}`}>
                        {statusIcon(app.status || 'pending')} {app.status || 'Pending'}
                      </span>
                    </div>
                    {app.reason && <p className="text-xs text-slate-600 mt-1">{app.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
