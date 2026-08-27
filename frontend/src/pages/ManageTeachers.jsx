import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  getSchoolByPrincipal,
  getTeachers,
  getClasses,
  deleteTeacher,
  updateTeacherAssignments,
} from '@/lib/db';
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  Users,
  Trash2,
  Copy,
  Check,
  Search,
  BookOpen,
  UserCheck,
  Share2,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function ManageTeachers() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState(null);

  const [rolesTeacher, setRolesTeacher] = useState(null);
  const [rolesClassTeacherId, setRolesClassTeacherId] = useState('');
  const [rolesSubjectAssignments, setRolesSubjectAssignments] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

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
    setSavingRoles(true);
    try {
      await updateTeacherAssignments(school.id, rolesTeacher.id, rolesClassTeacherId, rolesSubjectAssignments);
      setRolesTeacher(null);
      load(authUser);
    } catch (err) {
      alert('Error updating roles');
    }
    setSavingRoles(false);
  };


  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) {
        navigate(createPageUrl('PrincipalDashboard'));
        return;
      }
      const userId = user.id || user.uid;
      const schoolData = await getSchoolByPrincipal(userId);
      if (schoolData) {
        setSchool(schoolData);
        const [teacherList, classList] = await Promise.all([
          getTeachers(schoolData.id),
          getClasses(schoolData.id),
        ]);
        setTeachers(teacherList);
        setClasses(classList);
      }
    } catch (err) {
      console.error('Error loading teachers:', err);
    }
    setLoading(false);
  };

  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const schoolId = school?.id || 'demo_school';
    return `${baseUrl}/join-teacher?schoolId=${schoolId}`;
  };

  const handleCopyLink = () => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDelete = async (teacherId) => {
    try {
      await deleteTeacher(teacherId, school?.id);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
      setDeletingTeacher(null);
    } catch (err) {
      console.error('Error deleting teacher:', err);
    }
  };

  const getAssignedClassNames = (teacher) => {
    const assigned = classes.filter(
      (c) => c.teacher_id === teacher.id || c.teacher_id === teacher.user_id
    );
    if (assigned.length === 0) return null;
    return assigned.map((c) => `${c.name}${c.section ? `-${c.section}` : ''}`).join(', ');
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTeachersCount = teachers.length;
  const assignedClassesCount = classes.filter((c) => c.teacher_id).length;
  const unassignedClassesCount = classes.length - assignedClassesCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AppLayout title="Manage Teachers">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">
                    Manage Teachers
                  </h1>
                  <p className="text-xs text-slate-500">
                    {school?.name || 'School'} • {activeTeachersCount} Teachers Registered
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Invite Teacher
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Signed-up Teachers
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {activeTeachersCount}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Assigned Classes
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {assignedClassesCount} <span className="text-xs font-medium text-slate-400">/ {classes.length} Total</span>
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Unassigned Classes
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {unassignedClassesCount}
                </h3>
              </div>
            </div>
          </div>

          {/* Table Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search teachers by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredTeachers.length} of {teachers.length} teachers
            </div>
          </div>

          {/* Teachers List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Teacher Name</th>
                    <th className="p-4">Email / Gmail</th>
                    <th className="p-4">Assigned Class</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-semibold text-slate-700 text-base">No teachers signed up yet</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Click "Invite Teacher" to generate a direct link for your teachers to join your school.
                        </p>
                        <button
                          onClick={() => setInviteModalOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite Teacher Now
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const assignedClasses = getAssignedClassNames(teacher);
                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {teacher.name?.charAt(0).toUpperCase() || 'T'}
                            </div>
                            <span>{teacher.name}</span>
                          </td>
                          <td className="p-4 text-slate-600 font-mono text-xs">{teacher.email || '—'}</td>
                          <td className="p-4">
                            {assignedClasses ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                {assignedClasses}
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                Not Assigned
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                              Active
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setDeletingTeacher(teacher)}
                              className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60 transition-colors"
                              title="Remove Teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        
        {/* Manage Roles Modal */}
        {rolesTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900">Manage Roles: {rolesTeacher.name}</h3>
                <button onClick={() => setRolesTeacher(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form id="rolesForm" onSubmit={handleSaveRoles} className="space-y-6">
                  {/* Class Teacher */}
                  <div className="space-y-3 pb-6 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">Class Teacher Role</h4>
                      <p className="text-xs text-slate-500 mt-1">Select the primary class this teacher is responsible for.</p>
                    </div>
                    <select 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
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
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">Subject Teacher Roles</h4>
                      <p className="text-xs text-slate-500 mt-1">Assign this teacher to specific subjects across multiple classes.</p>
                    </div>
                    
                    <div className="space-y-2">
                      {rolesSubjectAssignments.map((assignment, index) => (
                        <div key={assignment._key || index} className="flex gap-2 items-center group">
                          <select 
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              const newArr = [...rolesSubjectAssignments];
                              newArr.splice(index, 1);
                              setRolesSubjectAssignments(newArr);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors mt-2"
                      onClick={() => setRolesSubjectAssignments([...rolesSubjectAssignments, { class_id: '', subject: '', _key: Math.random() }])}
                    >
                      <Sparkles className="w-4 h-4" />
                      Add Subject Assignment
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setRolesTeacher(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="rolesForm"
                  disabled={savingRoles}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#00a884] text-white text-sm font-medium rounded-lg hover:bg-[#008f6f] transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingRoles && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Roles
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Teacher Modal */}
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Invite Teacher to School</h3>
                    <p className="text-xs text-blue-100 mt-0.5">{school?.name || 'School'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="absolute top-6 right-6 text-white/80 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Share this invitation link with your teachers. When a teacher opens this link, it will automatically link them to <strong className="text-slate-900">{school?.name || 'your school'}</strong> during account setup.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Teacher Invitation Link
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                    <input
                      type="text"
                      readOnly
                      value={generateInviteLink()}
                      className="w-full bg-transparent text-xs font-mono text-slate-800 px-2 focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        copiedLink
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-normal">
                    <p className="font-bold mb-0.5">Quick Registration</p>
                    <p className="text-blue-800/80">
                      Teachers will only need to enter their Name, Gmail/Email, and Password to join and access the Teacher Dashboard instantly.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setInviteModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingTeacher && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Remove Teacher</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{deletingTeacher.name}</strong> from your school? They will lose access to teacher tools for this school.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingTeacher(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingTeacher.id)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
                >
                  Remove Teacher
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
