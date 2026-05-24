import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/hooks/AuthContext';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { getSchoolByPrincipal, updateSchool } from '@/lib/db';
import { ArrowLeft, Save, Copy, Check, Loader2, User, Building2, Shield, RefreshCw } from 'lucide-react';
import { generateCode } from '@/lib/db';

const TABS = ['School Info', 'Profile', 'Settings'];

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
  const [settingsData, setSettingsData] = useState({
    attendance_threshold: 75,
    academic_year_start: '',
    academic_year_end: '',
  });

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
          attendance_threshold: schoolData.attendance_threshold ?? 75,
          academic_year_start: schoolData.academic_year_start || '',
          academic_year_end: schoolData.academic_year_end || '',
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
        attendance_threshold: settingsData.attendance_threshold,
        academic_year_start: settingsData.academic_year_start,
        academic_year_end: settingsData.academic_year_end,
      });
      alert('Settings saved!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
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

              <div className="border-t border-slate-100 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Academic Year</h3>
                <p className="text-xs text-slate-400 mb-3">
                  All dashboards and report cards will only show data within this date range.
                  Set the end date whenever the year finishes — staff can then print year-end report cards from View Students.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={settingsData.academic_year_start}
                      onChange={e => setSettingsData({ ...settingsData, academic_year_start: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={settingsData.academic_year_end}
                      onChange={e => setSettingsData({ ...settingsData, academic_year_end: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
                {settingsData.academic_year_start && settingsData.academic_year_end && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-2">
                    Academic Year: <strong>{settingsData.academic_year_start}</strong> → <strong>{settingsData.academic_year_end}</strong>
                    {' '}({settingsData.academic_year_start.slice(0,4)}–{settingsData.academic_year_end.slice(0,4)})
                  </p>
                )}
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

      </main>
    </div>
  );
}
