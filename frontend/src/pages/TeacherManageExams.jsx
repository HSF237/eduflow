import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  getTeacherByUserId,
  getClasses,
  getExamsBySchool,
  createExam,
  updateExam,
  deleteExam,
} from '@/lib/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';

const EXAM_TYPES = ['UT', 'Periodic Test', 'Half Yearly', 'Annual', 'Other'];

const TYPE_LABELS = {
  UT: 'Unit Test (UT)',
  'Periodic Test': 'Periodic Test',
  'Half Yearly': 'Half Yearly',
  Annual: 'Annual',
  Other: 'Other',
};

const emptyForm = {
  name: '',
  type: 'UT',
  class_id: '',
  subject: '',
  max_marks: 100,
  exam_date: '',
};

export default function TeacherManageExams() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [bulkMode, setBulkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (user) => {
    try {
      if (!user) { navigate(createPageUrl('Login')); return; }

      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) { navigate(createPageUrl('JoinSchool')); return; }

      setTeacher(teacherData);
      setSchool(teacherData.schools);

      const schoolId = teacherData.school_id;
      const allClasses = await getClasses(schoolId);
      const teacherClasses = allClasses.filter(c =>
        (teacherData.assigned_classes || []).includes(c.id)
      );
      setClasses(teacherClasses);

      const allExams = await getExamsBySchool(schoolId);
      const teacherExams = allExams.filter(e =>
        (teacherData.assigned_classes || []).includes(e.class_id)
      );
      setExams(teacherExams);
    } catch (err) {
      console.error(err);
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  const refreshExams = async () => {
    if (!teacher) return;
    const allExams = await getExamsBySchool(teacher.school_id);
    const teacherExams = allExams.filter(e =>
      (teacher.assigned_classes || []).includes(e.class_id)
    );
    setExams(teacherExams);
  };

  const openAdd = () => {
    setEditingExam(null);
    setFormData(emptyForm);
    setBulkMode(false);
    setDialogOpen(true);
  };

  const openEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      type: exam.type,
      class_id: exam.class_id,
      subject: exam.subject || '',
      max_marks: exam.max_marks,
      exam_date: exam.exam_date || '',
    });
    setBulkMode(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExam(null);
    setFormData(emptyForm);
    setBulkMode(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id) { showToast('Please select a class', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        class_id: formData.class_id,
        subject: formData.subject,
        max_marks: Number(formData.max_marks),
        exam_date: formData.exam_date || null,
        school_id: teacher.school_id,
        created_by: teacher.id,
      };

      if (editingExam) {
        await updateExam(editingExam.id, payload);
        showToast('Exam updated successfully');
      } else {
        await createExam(payload);
        showToast('Exam created successfully');
      }
      closeDialog();
      await refreshExams();
    } catch (err) {
      console.error(err);
      showToast('Failed to save exam', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Delete this exam? All marks for this exam will also be removed.')) return;
    try {
      await deleteExam(examId);
      showToast('Exam deleted');
      await refreshExams();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete exam', 'error');
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="text-xl font-bold text-slate-800">Manage Exams</h1>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Exam Name', 'Type', 'Class', 'Subject', 'Max Marks', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No exams yet. Click "Add Exam" to create one.
                    </td>
                  </tr>
                ) : (
                  exams.map(exam => (
                    <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{exam.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {exam.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{getClassName(exam.class_id)}</td>
                      <td className="px-4 py-3 text-slate-600">{exam.subject || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{exam.max_marks}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(exam)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDialog} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingExam ? 'Edit Exam' : 'Add New Exam'}
              </h2>
              <button onClick={closeDialog} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Bulk mode checkbox */}
              {!editingExam && (
                <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkMode}
                    onChange={e => setBulkMode(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    Create exams for multiple subjects
                  </span>
                </label>
              )}

              {/* Exam Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unit Test 1"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Type + Class */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    {EXAM_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Class</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}{cls.section ? ' - ' + cls.section : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g., Mathematics"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam Date</label>
                  <input
                    type="date"
                    value={formData.exam_date}
                    onChange={e => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Max Marks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Marks</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.max_marks}
                  onChange={e => setFormData({ ...formData, max_marks: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingExam ? 'Update Exam' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
