import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { getSchoolByPrincipal, getClasses, getStudents, getTeachers, getTodayAttendanceSummary, getAttendanceByClass, createClass, createStudent, updateTeacherAssignments } from '@/lib/db';
import { createPageUrl } from '@/utils';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoaders';
import {
  Users, BookOpen, UserCog, Clock, CheckCircle,
  AlertTriangle, GraduationCap, Bell,
  Settings, LogOut, Copy, Check, X, Loader2, Menu
} from 'lucide-react';

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0, pending: 0 });
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  const [rolesTeacher, setRolesTeacher] = useState(null);
  const [rolesClassTeacherId, setRolesClassTeacherId] = useState('');
  const [rolesSubjectAssignments, setRolesSubjectAssignments] = useState([]);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', section: '' });
  const [studentForm, setStudentForm] = useState({ name: '', roll_number: '', admission_number: '', class_id: '', parent_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth) load(authUser);
  }, [isLoadingAuth, authUser]);

  const load = async (user) => {
    try {
      if (!user) { navigate('/login?role=principal'); return; }
      setUser(user);

      const userId = user.id || user.uid;
      const schoolData = await getSchoolByPrincipal(userId);
      if (!schoolData) { navigate(createPageUrl('SetupSchool')); return; }
      setSchool(schoolData);

      const cls = await getClasses(schoolData.id).catch(() => []);
      const stu = await getStudents(schoolData.id).catch(() => []);
      const tea = await getTeachers(schoolData.id).catch(() => []);
      const att = await getTodayAttendanceSummary(schoolData.id).catch(() => []);

      let fullAtt = [];
      try {
        if (cls && cls.length > 0) {
          const attArrays = await Promise.all(cls.map(c => getAttendanceByClass(c.id).catch(() => [])));
          fullAtt = (attArrays || []).flat();
        }
      } catch (e) {}

      setClasses(cls || []);
      setStudents(stu || []);
      setTeachers(tea || []);
      setTodayAttendance(att || []);
      setAllAttendance(fullAtt);
      setStats({
        students: (stu || []).length,
        classes: (cls || []).length,
        teachers: (tea || []).length,
        pending: 0
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => logout();

  const copyCode = () => {
    navigator.clipboard.writeText(school.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddClass = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createClass({ ...classForm, school_id: school.id });
      setShowAddClass(false); setClassForm({ name: '', section: '' }); load();
    } catch (err) { alert('Error creating class'); }
    setSaving(false);
  };

  
  const handleOpenRoles = (t) => {
    setRolesTeacher(t);
    const ctClass = classes.find(c => c.class_teacher_id === t.id);
    setRolesClassTeacherId(ctClass ? ctClass.id : '');
    const sa = [];
    classes.forEach(c => {
      if (Array.isArray(c.subject_teachers)) {
        c.subject_teachers.forEach(st => {
          if (st.teacher_id === t.id && st.subject) {
            sa.push({ class_id: c.id, subject: st.subject, _key: Math.random() });
          }
        });
      }
    });
    setRolesSubjectAssignments(sa);
  };

  const handleSaveRoles = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTeacherAssignments(school.id, rolesTeacher.id, rolesClassTeacherId, rolesSubjectAssignments);
      setRolesTeacher(null);
      load();
    } catch (err) {
      alert('Error updating roles');
    }
    setSaving(false);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createStudent({ ...studentForm, school_id: school.id });
      setShowAddStudent(false); setStudentForm({ name: '', roll_number: '', admission_number: '', class_id: '', parent_name: '' }); load();
    } catch (err) { alert('Error adding student'); }
    setSaving(false);
  };

  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const attendancePct = stats.students > 0 ? Math.round((presentToday / stats.students) * 100) : 0;

  const getStudentPct = (studentId) => {
    const recs = allAttendance.filter(a => a.student_id === studentId);
    if (!recs.length) return null;
    const present = recs.filter(a => ['present', 'late', 'Present', 'Late'].includes(a.status)).length;
    return Math.round((present / recs.length) * 100);
  };

  const atRiskStudents = students
    .map(s => ({ ...s, pct: getStudentPct(s.id) }))
    .filter(s => s.pct !== null && s.pct < 75)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <DashboardSidebar
        role="principal"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        teacherName={user?.displayName || 'Principal'}
        schoolName={school?.name}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="bg-blue-600 w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 leading-tight truncate text-sm sm:text-base">{user?.displayName || user?.email?.split('@')[0] || 'Principal'}</p>
              <p className="text-xs text-slate-500 hidden sm:block">Principal Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {school && (
              <button onClick={copyCode} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm hover:bg-slate-50">
                <span className="font-bold text-blue-600 tracking-widest">{school.code}</span>
                {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} className="text-slate-400" />}
              </button>
            )}
            <button onClick={() => navigate(createPageUrl('Notifications'))} className="p-2 text-slate-400 hover:text-slate-600"><Bell size={18} /></button>
            <button onClick={() => navigate(createPageUrl('PrincipalSettings'))} className="p-2 text-slate-400 hover:text-slate-600"><Settings size={18} /></button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-600"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Students" value={stats.students} icon={<Users size={22} />} color="bg-blue-500" />
            <StatCard title="Total Classes" value={stats.classes} icon={<BookOpen size={22} />} color="bg-green-500" />
            <StatCard title="Teachers" value={stats.teachers} icon={<UserCog size={22} />} color="bg-purple-500" />
            <StatCard title="Pending Approval" value={stats.pending} icon={<Clock size={22} />} color="bg-orange-500" />
          </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          {['Overview', 'Classes', 'Teachers', 'Notifications'].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toLowerCase())}
              className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${activeTab === t.toLowerCase() ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Attendance */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-green-500" />
                <h3 className="font-semibold text-slate-800">Today's Attendance</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={attendancePct > 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth="3" strokeDasharray={`${attendancePct} ${100 - attendancePct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">{attendancePct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-600">{presentToday} of {stats.students} students present</p>
                  <p className="text-xs text-slate-400 mt-1">Updated just now</p>
                </div>
              </div>
            </div>

            {/* At-Risk Students */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-orange-500" />
                <h3 className="font-semibold text-slate-800">At-Risk Students</h3>
              </div>
              {atRiskStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <CheckCircle size={32} className="text-green-400 mb-2" />
                  <p>No at-risk students!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {atRiskStudents.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
                        <p className="text-xs text-slate-400">{classes.find(c => c.id === s.class_id)?.name || ''}</p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Class Name</th>
                  <th className="text-left p-4 font-medium text-slate-600">Section</th>
                  <th className="text-left p-4 font-medium text-slate-600">Teacher</th>
                  <th className="text-right p-4 font-medium text-slate-600">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.section || '—'}</td>
                    <td className="p-4 text-slate-600">
                      {c.teacher_name || teachers.find(t => t.id === c.teacher_id)?.name || <span className="text-slate-400 italic">Not assigned</span>}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600">{students.filter(s => s.class_id === c.id).length}</td>
                  </tr>
                ))}
                {classes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No classes yet. Add your first class.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Name</th>
                  <th className="text-left p-4 font-medium text-slate-600">Email</th>
                  <th className="text-left p-4 font-medium text-slate-600">Assigned Classes</th>
                  <th className="text-right p-4 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map(t => {
                  const assignedClasses = classes.filter(c => c.teacher_id === t.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-900">{t.name}</td>
                      <td className="p-4 text-slate-600">{t.email}</td>
                      <td className="p-4">
                        {assignedClasses.length === 0
                          ? <span className="text-slate-400 italic text-xs">None assigned</span>
                          : <div className="flex flex-wrap gap-1">
                              {assignedClasses.map(c => (
                                <span key={c.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  {c.name}{c.section ? ` ${c.section}` : ''}
                                </span>
                              ))}
                            </div>
                        }
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Active</span>
                      </td>
                    </tr>
                  );
                })}
                {teachers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No teachers joined yet. Share your school code.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <Bell size={32} className="mx-auto mb-2 text-slate-300" />
            <p>No notifications yet.</p>
          </div>
        )}
      </div>

      
        {/* Manage Roles Modal */}
        {rolesTeacher && (
          <Modal title={`Manage Roles: ${rolesTeacher.name}`} onClose={() => setRolesTeacher(null)}>
            <form onSubmit={handleSaveRoles} className="space-y-6">
              
              {/* Class Teacher */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="font-medium text-slate-900 text-sm">Class Teacher Role</h3>
                <p className="text-xs text-slate-500 mb-2">Select the primary class this teacher is responsible for.</p>
                <select 
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  value={rolesClassTeacherId}
                  onChange={e => setRolesClassTeacherId(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </div>

              {/* Subject Teacher */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-900 text-sm">Subject Teacher Roles</h3>
                <p className="text-xs text-slate-500 mb-2">Assign this teacher to specific subjects across multiple classes.</p>
                
                {rolesSubjectAssignments.map((assignment, index) => (
                  <div key={assignment._key || index} className="flex gap-2 items-center">
                    <select 
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                      value={assignment.class_id}
                      onChange={e => {
                        const newArr = [...rolesSubjectAssignments];
                        newArr[index].class_id = e.target.value;
                        setRolesSubjectAssignments(newArr);
                      }}
                      required
                    >
                      <option value="">Select Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                      ))}
                    </select>
                    
                    <input 
                      type="text"
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Subject (e.g. English)"
                      value={assignment.subject}
                      onChange={e => {
                        const newArr = [...rolesSubjectAssignments];
                        newArr[index].subject = e.target.value;
                        setRolesSubjectAssignments(newArr);
                      }}
                      required
                    />
                    
                    <button 
                      type="button"
                      className="p-2 text-slate-400 hover:text-red-500"
                      onClick={() => {
                        const newArr = [...rolesSubjectAssignments];
                        newArr.splice(index, 1);
                        setRolesSubjectAssignments(newArr);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  onClick={() => setRolesSubjectAssignments([...rolesSubjectAssignments, { class_id: '', subject: '', _key: Math.random() }])}
                >
                  + Add Subject Assignment
                </button>
              </div>

              <ModalButtons onCancel={() => setRolesTeacher(null)} saving={saving} label="Save Roles" />
            </form>
          </Modal>
        )}

        {/* Add Class Modal */}
      {showAddClass && (
        <Modal title="Add Class" onClose={() => setShowAddClass(false)}>
          <form onSubmit={handleAddClass} className="space-y-4">
            <FormField label="Class Name" placeholder="e.g. Class 8" value={classForm.name} onChange={v => setClassForm({ ...classForm, name: v })} required />
            <FormField label="Division / Section" placeholder="e.g. A" value={classForm.section} onChange={v => setClassForm({ ...classForm, section: v })} />
            <ModalButtons onCancel={() => setShowAddClass(false)} saving={saving} label="Add Class" />
          </form>
        </Modal>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <Modal title="Add Student" onClose={() => setShowAddStudent(false)}>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <FormField label="Student Name" placeholder="Full name" value={studentForm.name} onChange={v => setStudentForm({ ...studentForm, name: v })} required />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Roll No" placeholder="e.g. 001" value={studentForm.roll_number} onChange={v => setStudentForm({ ...studentForm, roll_number: v })} />
              <FormField label="Adm No" placeholder="e.g. 2024001" value={studentForm.admission_number} onChange={v => setStudentForm({ ...studentForm, admission_number: v })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={studentForm.class_id} onChange={e => setStudentForm({ ...studentForm, class_id: e.target.value })}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section ? `- ${c.section}` : ''}</option>)}
              </select>
            </div>
            <FormField label="Parent Name" placeholder="Parent / Guardian name" value={studentForm.parent_name} onChange={v => setStudentForm({ ...studentForm, parent_name: v })} />
            <ModalButtons onCancel={() => setShowAddStudent(false)} saving={saving} label="Add Student" />
          </form>
        </Modal>
      )}
      </div>
      <MobileBottomNav role="principal" />
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} rounded-xl p-4 text-white flex justify-between items-center`}>
      <div>
        <p className="text-white/80 text-xs mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      <div className="opacity-80">{icon}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function ModalButtons({ onCancel, saving, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : label}
      </button>
    </div>
  );
}
