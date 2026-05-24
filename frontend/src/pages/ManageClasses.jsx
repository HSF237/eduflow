import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getStudents,
  getTeachers,
  generateCode,
  getSchoolByPrincipal,
} from '@/lib/db';
import {
  ArrowLeft,
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  Edit2,
  Copy,
  Check,
  UserCog,
} from 'lucide-react';

export default function ManageClasses() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolId, setSchoolId] = useState(null);

  // Add / Edit modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', section: '' });

  // Copy parent code feedback
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) {
        navigate(createPageUrl('PrincipalDashboard'));
        return;
      }
      const school = await getSchoolByPrincipal(user.uid);
      if (!school) {
        navigate(createPageUrl('PrincipalDashboard'));
        return;
      }
      setSchoolId(school.id);
      const [classData, studentData, teacherData] = await Promise.all([
        getClasses(school.id),
        getStudents(school.id),
        getTeachers(school.id),
      ]);
      setClasses(classData);
      setStudents(studentData);
      setTeachers(teacherData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingClass(null);
    setFormData({ name: '', section: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (cls) => {
    setEditingClass(cls);
    setFormData({ name: cls.name, section: cls.section || '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClass(null);
    setFormData({ name: '', section: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, {
          name: formData.name.trim(),
          section: formData.section.trim(),
        });
      } else {
        await createClass({
          school_id: schoolId,
          name: formData.name.trim(),
          section: formData.section.trim(),
          parent_code: generateCode(6),
        });
      }
      await loadData(authUser);
      closeDialog();
    } catch (err) {
      console.error('Error saving class:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? All students in this class will need to be reassigned.')) return;
    try {
      await deleteClass(classId);
      await loadData(authUser);
    } catch (err) {
      console.error('Error deleting class:', err);
    }
  };

  const handleAssignTeacher = async (cls, teacherId) => {
    const t = teachers.find(t => t.id === teacherId) || null;
    try {
      await updateClass(cls.id, {
        teacher_id: teacherId || null,
        teacher_name: t?.name || null,
      });
      setClasses(prev => prev.map(c =>
        c.id === cls.id ? { ...c, teacher_id: teacherId || null, teacher_name: t?.name || null } : c
      ));
    } catch (err) {
      console.error('Error assigning teacher:', err);
    }
  };

  const copyParentCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStudentCount = (classId) =>
    students.filter((s) => s.class_id === classId).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Manage Classes</h1>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500 font-medium">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'}
          </p>
          <button
            onClick={openAddDialog}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>

        {/* Grid */}
        {classes.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No Classes Yet</h3>
            <p className="text-gray-400 text-sm">Create your first class to start adding students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => {
              const studentCount = getStudentCount(cls.id);
              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{cls.name}</h3>
                        {cls.section && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            Section {cls.section}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openEditDialog(cls)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit class"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete class"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Students:</span>
                      <span className="font-medium text-gray-800">{studentCount}</span>
                    </div>
                  </div>

                  {/* Assign Teacher */}
                  <div className="mb-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <UserCog className="w-3.5 h-3.5" /> Assign Teacher
                    </label>
                    <select
                      value={cls.teacher_id || ''}
                      onChange={(e) => handleAssignTeacher(cls, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Not assigned —</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Parent Code */}
                  {cls.parent_code && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-700 mb-0.5">Parent Code</p>
                        <code className="text-sm font-mono font-bold text-purple-700">
                          {cls.parent_code}
                        </code>
                      </div>
                      <button
                        onClick={() => copyParentCode(cls.parent_code)}
                        className="p-1.5 rounded-md hover:bg-purple-100 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === cls.parent_code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Add / Edit Modal ── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Class Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Class 8, Grade 5"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              {/* Division / Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Division
                </label>
                <input
                  type="text"
                  placeholder="e.g., A, B, C"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingClass ? (
                    'Update Class'
                  ) : (
                    'Add Class'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
