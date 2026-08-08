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
  getSchoolByPrincipal,
} from '@/lib/db';
import {
  ArrowLeft,
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  Edit2,
  UserCog,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function ManageClasses() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolId, setSchoolId] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', section: '' });

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
      if (school) {
        setSchoolId(school.id);
        const [clsList, stuList, tchList] = await Promise.all([
          getClasses(school.id),
          getStudents(school.id),
          getTeachers(school.id),
        ]);
        setClasses(clsList);
        setStudents(stuList);
        setTeachers(tchList);
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingClass(null);
    setFormData({ name: '', section: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (cls) => {
    setEditingClass(cls);
    setFormData({ name: cls.name || '', section: cls.section || '' });
    setDialogOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, formData);
      } else {
        await createClass({
          ...formData,
          school_id: schoolId,
        });
      }
      await loadData(authUser);
      setDialogOpen(false);
    } catch (err) {
      console.error('Error saving class:', err);
    }
    setSubmitting(false);
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteClass(classId);
      await loadData(authUser);
    } catch (err) {
      console.error('Error deleting class:', err);
    }
  };

  const handleAssignTeacher = async (cls, teacherId) => {
    const t = teachers.find((t) => t.id === teacherId) || null;
    try {
      await updateClass(cls.id, {
        teacher_id: teacherId || null,
        teacher_name: t?.name || null,
      });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === cls.id
            ? { ...c, teacher_id: teacherId || null, teacher_name: t?.name || null }
            : c
        )
      );
    } catch (err) {
      console.error('Error assigning teacher:', err);
    }
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
    <AppLayout title="Manage Classes">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Manage Classes
                </h1>
                <p className="text-xs text-gray-500">
                  {classes.length} {classes.length === 1 ? 'Class' : 'Classes'} registered
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <button
                onClick={openAddDialog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Class
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {classes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                No classes created yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                Get started by creating your first class to organize students, assign teachers, and manage attendance.
              </p>
              <button
                onClick={openAddDialog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const count = getStudentCount(cls.id);
                return (
                  <div
                    key={cls.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {cls.name}
                          </h3>
                          {cls.section && (
                            <span className="inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              Section {cls.section}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditDialog(cls)}
                            className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors"
                            title="Edit Class"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Enrolled Students:</span>
                          <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {count} {count === 1 ? 'Student' : 'Students'}
                          </span>
                        </div>
                        {cls.parentCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Class Code:</span>
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {cls.parentCode}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                        <UserCog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {cls.teacher_name || 'No Teacher Assigned'}
                        </span>
                      </div>
                      <select
                        value={cls.teacher_id || ''}
                        onChange={(e) => handleAssignTeacher(cls, e.target.value)}
                        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Assign Teacher…</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {dialogOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </h3>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveClass} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Grade 10 or Class 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Section / Division (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, section: e.target.value }))
                    }
                    placeholder="e.g. A, B, or Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium transition-colors"
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
    </AppLayout>
  );
}
