import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getTeacherByUserId, getSchoolByPrincipal,
  getLeaveRequests, updateLeaveStatus,
  getStudents, getClasses,
} from '@/lib/db';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

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

      let sid = null;
      const school = await getSchoolByPrincipal(user.uid);
      if (school) {
        sid = school.id;
        setBackTo('PrincipalDashboard');
      } else {
        const teacher = await getTeacherByUserId(user.uid);
        if (teacher) sid = teacher.school_id;
      }

      if (sid) {
        const [clsList, stuList, leaveList] = await Promise.all([
          getClasses(sid),
          getStudents(sid),
          getLeaveRequests(sid),
        ]);
        setClasses(clsList);
        setStudents(stuList);
        setLeaves(leaveList);
      }
    } catch (err) {
      console.error('Error loading ReviewLeave:', err);
    }
    setLoading(false);
  };

  const getStudentName = (stuId) => {
    const s = students.find(st => st.id === stuId);
    return s ? s.name : 'Unknown Student';
  };

  const getClassName = (classId) => {
    const c = classes.find(cl => cl.id === classId);
    return c ? `${c.name}${c.section ? ' - ' + c.section : ''}` : '';
  };

  const handleAction = async (status) => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await updateLeaveStatus(selectedApp.id, status, remarks);
      setLeaves(prev => prev.map(l => l.id === selectedApp.id ? { ...l, status, remarks } : l));
      setSelectedApp(null);
      setRemarks('');
    } catch (err) {
      console.error('Error updating leave status:', err);
    }
    setSubmitting(false);
  };

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
    <AppLayout title="Review Leave Applications">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl(backTo))}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-bold text-lg text-slate-800">Leave Applications</h1>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button onClick={() => setActiveTab('pending')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Pending ({pending.length})
            </button>
            <button onClick={() => setActiveTab('reviewed')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'reviewed' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Reviewed ({reviewed.length})
            </button>
          </div>

          {shown.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 text-sm">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              No {activeTab} leave applications
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base">{app.student_name || getStudentName(app.student_id)}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusColor(app.status || 'pending')}`}>
                        {app.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {app.from_date === app.to_date ? app.from_date : `${app.from_date} to ${app.to_date}`}
                    </p>
                    {app.reason && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                        "{app.reason}"
                      </p>
                    )}
                  </div>

                  {(!app.status || app.status === 'pending') && (
                    <button onClick={() => setSelectedApp(app)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0">
                      Review Application
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedApp && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Review Leave: {selectedApp.student_name || getStudentName(selectedApp.student_id)}</h3>
              <p className="text-xs text-slate-500">Dates: {selectedApp.from_date} to {selectedApp.to_date}</p>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Remarks / Reason (Optional)</label>
                <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Approved for medical leave..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => handleAction('rejected')} disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
                <button onClick={() => handleAction('approved')} disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </div>
              <button onClick={() => { setSelectedApp(null); setRemarks(''); }}
                className="w-full text-slate-500 hover:text-slate-700 text-xs py-1 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
