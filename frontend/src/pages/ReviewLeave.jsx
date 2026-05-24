import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getSchoolByPrincipal,
  getLeaveRequests, getLeavesByClass, updateLeaveStatus,
  getStudents, getClasses
} from '@/lib/db';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

export default function ReviewLeave() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [backTo, setBackTo] = useState('TeacherDashboard');

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login'); return; }

      // Detect role
      const [school, teacher] = await Promise.all([
        getSchoolByPrincipal(user.uid),
        getTeacherByUserId(user.uid),
      ]);

      let schoolId, leaveData;
      if (school) {
        setBackTo('PrincipalDashboard');
        schoolId = school.id;
        leaveData = await getLeaveRequests(schoolId);
      } else if (teacher) {
        setBackTo('TeacherDashboard');
        schoolId = teacher.school_id;
        // Get leaves only for assigned classes
        const allLeaves = await getLeaveRequests(schoolId);
        const allClasses = await getClasses(schoolId);
        const myClassIds = allClasses.filter(c => c.teacher_id === teacher.id).map(c => c.id);
        leaveData = allLeaves.filter(l => myClassIds.includes(l.class_id));
      } else {
        navigate('/');
        return;
      }

      const [studs, cls] = await Promise.all([
        getStudents(schoolId),
        getClasses(schoolId),
      ]);
      setLeaves(leaveData);
      setStudents(studs);
      setClasses(cls);
    } catch (err) {
      console.error('ReviewLeave error:', err);
    }
    setLoading(false);
  };

  const handleReview = async (status) => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await updateLeaveStatus(selectedApp.id, status);
      setLeaves(prev => prev.map(l => l.id === selectedApp.id ? { ...l, status } : l));
      setSelectedApp(null);
      setRemarks('');
    } catch (err) {
      console.error('Review error:', err);
    }
    setSubmitting(false);
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '—';
  };

  const getStudentName = (studentId) => students.find(s => s.id === studentId)?.name || '—';

  const statusColor = (s) =>
    s === 'approved' ? 'bg-green-100 text-green-800' :
    s === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

  const pending = leaves.filter(l => !l.status || l.status === 'pending');
  const reviewed = leaves.filter(l => l.status && l.status !== 'pending');
  const shown = activeTab === 'pending' ? pending : reviewed;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(createPageUrl(backTo))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-bold text-lg text-slate-800">Review Leave Applications</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {[['pending', `Pending (${pending.length})`], ['reviewed', `Reviewed (${reviewed.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{activeTab === 'pending' ? 'No pending leave applications' : 'No reviewed applications yet'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map(app => (
              <div key={app.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{app.student_name || getStudentName(app.student_id)}</p>
                    <p className="text-xs text-slate-500">{getClassName(app.class_id)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(app.status || 'pending')}`}>
                    {app.status || 'Pending'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{app.from_date} — {app.to_date}</span>
                  </div>
                  {app.reason && <p className="text-slate-700"><span className="font-medium">Reason:</span> {app.reason}</p>}
                </div>

                {(!app.status || app.status === 'pending') && (
                  <button onClick={() => setSelectedApp(app)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Review Leave Application</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm mb-4">
              <p><span className="font-medium">Student:</span> {selectedApp.student_name || getStudentName(selectedApp.student_id)}</p>
              <p><span className="font-medium">Class:</span> {getClassName(selectedApp.class_id)}</p>
              <p><span className="font-medium">Duration:</span> {selectedApp.from_date} — {selectedApp.to_date}</p>
              {selectedApp.reason && <p><span className="font-medium">Reason:</span> {selectedApp.reason}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
                placeholder="Add remarks..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleReview('approved')} disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
              </button>
              <button onClick={() => handleReview('rejected')} disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
              </button>
            </div>
            <button onClick={() => { setSelectedApp(null); setRemarks(''); }}
              className="w-full mt-2 text-slate-500 hover:text-slate-700 text-sm py-1.5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
