import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getClassById, getStudentsByClass, getLeavesByClass, createLeaveRequest } from '@/lib/db';
import { ArrowLeft, Loader2, Send, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

import AppLayout from '@/components/AppLayout';

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
      
      let parentStudents = [];
      const linkedStr = localStorage.getItem('parent_linked_students');
      if (linkedStr) {
        try {
          parentStudents = JSON.parse(linkedStr);
        } catch (e) {
          parentStudents = studs.filter(s => s.id === parentStudentId);
        }
      } else {
        parentStudents = studs.filter(s => s.id === parentStudentId);
      }
      
      const sorted = parentStudents.slice().sort((a, b) => (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0));
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
    if (!form.from_date || !form.to_date) {
      setError('Please select both start and end dates'); return;
    }
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
    <AppLayout title="Apply for Leave">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-bold text-lg text-slate-800">Apply for Leave</h1>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" /> Leave Application Form
              </h2>

              {error && <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-lg border border-red-200">{error}</div>}
              {success && <div className="mb-4 text-xs bg-green-50 text-green-600 p-3 rounded-lg border border-green-200">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {students.length > 1 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Select Child *</label>
                    <select required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Roll: {s.roll_number || 'N/A'})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">From Date *</label>
                    <input type="date" required value={form.from_date}
                      onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">To Date *</label>
                    <input type="date" required value={form.to_date}
                      onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                      min={form.from_date}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason for Leave *</label>
                  <textarea required rows={4} value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Provide detailed reason for absence..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>

            {/* History */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-base mb-4">Application History</h2>
              {myLeaves.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No leave applications submitted yet
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {myLeaves.map(app => (
                    <div key={app.id} className="border border-slate-100 bg-slate-50 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-sm">
                          {app.student_name || 'Student'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 capitalize ${statusColor(app.status)}`}>
                          {statusIcon(app.status)} {app.status || 'pending'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {app.from_date === app.to_date
                            ? app.from_date
                            : `${app.from_date} to ${app.to_date}`}
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
    </AppLayout>
  );
}
