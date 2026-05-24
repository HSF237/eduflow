import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { getSchoolByPrincipal, updateSchool } from '@/lib/db';
import { seedDemoData, clearAllSchoolData } from '@/lib/seedData';
import { ArrowLeft, Save, Copy, Check, Loader2, User, Building2, Shield, Database, Trash2, FlaskConical, RefreshCw } from 'lucide-react';
import { generateCode } from '@/lib/db';

const TABS = ['School Info', 'Profile', 'Settings', 'Data'];

export default function PrincipalSettings() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('School Info');
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [school, setSchool] = useState(null);

  const [schoolData, setSchoolData] = useState({ name: '', address: '', phone: '', code: '' });
  const [profileData, setProfileData] = useState({ display_name: '' });
  const [settingsData, setSettingsData] = useState({ attendance_threshold: 75 });
  const [dataOp, setDataOp] = useState({ loading: false, msg: '', type: '' });

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) {
        navigate('/login?role=principal');
        return;
      }
      setCurrentUser(user);

      const schoolData = await getSchoolByPrincipal(user.uid);
      if (schoolData) {
        setSchool(schoolData);
        setSchoolData({
          name: schoolData.name || '',
          address: schoolData.address || '',
          phone: schoolData.phone || '',
          code: schoolData.code || ''
        });
        setSettingsData({
          attendance_threshold: schoolData.attendance_threshold ?? 75
        });
      }

      setProfileData({
        display_name: user.displayName || user.email || ''
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(schoolData.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSchoolInfo = async () => {
    if (!school) return;
    setSaving(true);
    try {
      await updateSchool(school.id, {
        name: schoolData.name,
        address: schoolData.address,
        phone: schoolData.phone,
        code: schoolData.code,
      });
      alert('School info updated!');
    } catch (err) {
      console.error('Error saving school:', err);
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: profileData.display_name });
      alert('Profile updated!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const saveSettings = async () => {
    if (!school) return;
    setSaving(true);
    try {
      await updateSchool(school.id, {
        attendance_threshold: settingsData.attendance_threshold
      });
      alert('Settings saved!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleSeedData = async () => {
    if (!school) return;
    if (!window.confirm('This will add demo classes, students, attendance, exams and marks to your school. Continue?')) return;
    setDataOp({ loading: true, msg: 'Seeding demo data... this may take 10-20 seconds', type: 'info' });
    try {
      const result = await seedDemoData(school.id);
      setDataOp({ loading: false, msg: `Done! Added ${result.classes} classes and ${result.students} students with attendance, exams & marks.`, type: 'success' });
    } catch (err) {
      console.error('Seed error:', err);
      setDataOp({ loading: false, msg: 'Failed to seed data. Check console for details.', type: 'error' });
    }
  };

  const handleClearData = async () => {
    if (!school) return;
    if (!window.confirm('⚠️ This will permanently delete ALL classes, students, attendance, exams and marks for your school. This cannot be undone. Are you sure?')) return;
    if (!window.confirm('Last warning: ALL school data will be deleted. Proceed?')) return;
    setDataOp({ loading: true, msg: 'Clearing all data...', type: 'info' });
    try {
      await clearAllSchoolData(school.id);
      setDataOp({ loading: false, msg: 'All data cleared successfully.', type: 'success' });
    } catch (err) {
      console.error('Clear error:', err);
      setDataOp({ loading: false, msg: 'Failed to clear data. Check console.', type: 'error' });
    }
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
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-bold text-xl text-slate-800">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* School Info tab */}
        {activeTab === 'School Info' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">School Information</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Update your school details</p>

            <div className="space-y-4">
              {/* Join code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School Join Code</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={schoolData.code}
                    onChange={(e) => setSchoolData({ ...schoolData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 font-mono text-base tracking-widest bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    maxLength={6}
                    placeholder="6-char code"
                  />
                  <button
                    onClick={copyCode}
                    title="Copy code"
                    className="flex items-center gap-1 px-3 py-2.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSchoolData({ ...schoolData, code: generateCode(6) })}
                    title="Generate new code"
                    className="flex items-center gap-1 px-3 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Share this 6-character code with teachers so they can join your school. You can type a custom code or click <span className="font-semibold">↻</span> to generate a new one. <span className="text-orange-600 font-medium">Changing the code means existing teachers won't need to re-enter it — only new ones.</span>
                </p>
              </div>

              {/* School Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={schoolData.name}
                  onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={schoolData.address}
                  onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={schoolData.phone}
                  onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <button
                onClick={saveSchoolInfo}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save School Info
              </button>
            </div>
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'Profile' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">Your Profile</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Manage your account details</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="text"
                  value={currentUser?.email || ''}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'Settings' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">Alert Thresholds</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Configure when alerts are triggered</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attendance Threshold (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settingsData.attendance_threshold}
                  onChange={(e) => setSettingsData({ ...settingsData, attendance_threshold: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">Alert when student attendance falls below this percentage</p>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Data tab */}
        {activeTab === 'Data' && (
          <div className="space-y-5">
            {/* Status message */}
            {dataOp.msg && (
              <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2
                ${dataOp.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                  dataOp.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {dataOp.loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {dataOp.msg}
              </div>
            )}

            {/* Load Demo Data */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Load Demo Data</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Populate your school with sample classes, students, 2 months of attendance records, exams and marks for testing.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mb-5 space-y-1">
                <p>• <strong>6 classes</strong> — Class 6A, 7A, 7B, 8A, 9B, 10A</p>
                <p>• <strong>35 students</strong> — with roll numbers, admission numbers, parent names</p>
                <p>• <strong>~40 days</strong> of attendance data (weekdays only)</p>
                <p>• <strong>18 exams</strong> — Unit Tests, Periodic Tests, Half Yearly per class</p>
                <p>• <strong>Marks</strong> for every student in every exam</p>
              </div>
              <button
                onClick={handleSeedData}
                disabled={dataOp.loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {dataOp.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Load Demo Data
              </button>
            </div>

            {/* Clear All Data */}
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-800">Clear All Data</h2>
              </div>
              <p className="text-sm text-slate-500 mb-2">
                Permanently delete all classes, students, attendance, exams and marks for your school.
              </p>
              <p className="text-xs text-red-600 font-medium mb-5">
                ⚠️ This action cannot be undone. Your school account and login will remain.
              </p>
              <button
                onClick={handleClearData}
                disabled={dataOp.loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {dataOp.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Clear All Data
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
