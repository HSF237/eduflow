import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import { useNavigate, Link } from 'react-router-dom';
import { getTeacherByUserId, getClasses, updateTeacher } from '@/lib/db';
import { ArrowLeft, Loader2, Save, User, BookOpen } from 'lucide-react';

export default function TeacherSettings() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [school, setSchool] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ name: '', phone: '' });

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=teacher'); return; }
      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) { navigate(createPageUrl('JoinSchool')); return; }
      setTeacher(teacherData);
      setSchool(teacherData.schools || null);
      setProfileData({ name: teacherData.name || '', phone: teacherData.phone || '' });
      const allClasses = await getClasses(teacherData.school_id);
      setAssignedClasses(allClasses.filter(c => c.teacher_id === teacherData.id));
    } catch (err) {
      console.error('TeacherSettings load error:', err);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!teacher) return;
    setSaving(true);
    try {
      await updateTeacher(teacher.id, { name: profileData.name, phone: profileData.phone });
      await updateProfile(auth.currentUser, { displayName: profileData.name });
      alert('Profile updated!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save. Try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-bold text-xl text-slate-800">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {['profile', 'classes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              {tab === 'profile' ? 'Profile' : 'My Classes'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">Your Profile</h2>
            </div>

            {school && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
                School: <span className="font-semibold">{school.name}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input value={authUser?.email || ''} readOnly
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input value={profileData.name}
                onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input value={profileData.phone} placeholder="Your phone number"
                onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <button onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">My Assigned Classes</h2>
            </div>

            {assignedClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No classes assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {assignedClasses.map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{cls.name}</p>
                        {cls.section && <p className="text-sm text-slate-500">Section {cls.section}</p>}
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => navigate(createPageUrl('SelectClasses'))}
              className="w-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
              Change Assigned Classes
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
