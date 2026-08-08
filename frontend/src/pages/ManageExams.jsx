import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getSchoolByPrincipal, getClasses, getExamsBySchool,
  getSubjects, createExam, updateExam, deleteExam
} from '@/lib/db';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, BookMarked } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const EXAM_TYPES = ['UT', 'Periodic Test', 'Half Yearly', 'Annual', 'Other'];

const emptyForm = { name: '', type: 'UT', class_id: '', subject: '', max_marks: 100, exam_date: '' };

export default function ManageExams() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterClass, setFilterClass] = useState('all');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=principal'); return; }
      const schoolData = await getSchoolByPrincipal(user.uid);
      if (!schoolData) { navigate(createPageUrl('SetupSchool')); return; }

      setSchool(schoolData);
      const [cls, ex] = await Promise.all([
        getClasses(schoolData.id),
        getExamsBySchool(schoolData.id),
      ]);
      setClasses(cls);
      setExams(ex);
    } catch (err) {
      console.error('ManageExams load error:', err);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingExam(null);
    setBulkMode(false);
    setSelectedSubjects([]);
    const defaultClass = classes[0]?.id || '';
    setForm({ ...emptyForm, class_id: defaultClass });
    if (defaultClass) fetchSubjectsForClass(defaultClass);
    setDialogOpen(true);
  };

  const fetchSubjectsForClass = async (classId) => {
    try {
      const subs = await getSubjects(classId);
      setAvailableSubjects(subs);
    } catch (err) {
      console.error('Error fetching subjects for class:', err);
      setAvailableSubjects([]);
    }
  };

  const handleClassChange = (classId) => {
    setForm(prev => ({ ...prev, class_id: classId, subject: '' }));
    setSelectedSubjects([]);
    if (classId) fetchSubjectsForClass(classId);
    else setAvailableSubjects([]);
  };

  const openEdit = (exam) => {
    setEditingExam(exam);
    setBulkMode(false);
    setForm({
      name: exam.name || '',
      type: exam.type || 'UT',
      class_id: exam.class_id || '',
      subject: exam.subject || '',
      max_marks: exam.max_marks || 100,
      exam_date: exam.exam_date || '',
    });
    if (exam.class_id) fetchSubjectsForClass(exam.class_id);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExam(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!school) return;
    setSubmitting(true);
    try {
      if (editingExam) {
        await updateExam(editingExam.id, form);
      } else if (bulkMode) {
        const subjectsToCreate = selectedSubjects.length > 0
          ? selectedSubjects
          : availableSubjects.map(s => s.name);

        if (subjectsToCreate.length === 0) {
          alert('No subjects available or selected for this class.');
          setSubmitting(false);
          return;
        }

        for (const subName of subjectsToCreate) {
          await createExam({
            ...form,
            school_id: school.id,
            subject: subName,
          });
        }
      } else {
        await createExam({
          ...form,
          school_id: school.id,
        });
      }

      const updatedExams = await getExamsBySchool(school.id);
      setExams(updatedExams);
      closeDialog();
    } catch (err) {
      console.error('Error saving exam:', err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  const getClassName = (classId) => {
    const c = classes.find(cls => cls.id === classId);
    return c ? `${c.name}${c.section ? ' - ' + c.section : ''}` : '—';
  };

  const typeBadgeColor = (type) => {
    switch (type) {
      case 'Annual': return 'bg-purple-100 text-purple-700';
      case 'Half Yearly': return 'bg-blue-100 text-blue-700';
      case 'UT': return 'bg-emerald-100 text-emerald-700';
      case 'Periodic Test': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filtered = filterClass === 'all'
    ? exams
    : exams.filter(e => e.class_id === filterClass);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <AppLayout title="Manage Exams">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-bold text-xl text-slate-800">Manage Exams</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Filter by class:</label>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="all">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
              </select>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Exam
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600">Exam Name</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Class</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Subject</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Max Marks</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                  <th className="text-right p-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      <BookMarked className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      No exams yet. Click "Add Exam" to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map(exam => (
                    <tr key={exam.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-900">{exam.name}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadgeColor(exam.type)}`}>{exam.type}</span>
                      </td>
                      <td className="p-4 text-slate-600">{getClassName(exam.class_id)}</td>
                      <td className="p-4 text-slate-600">{exam.subject || '—'}</td>
                      <td className="p-4 text-slate-700 font-medium">{exam.max_marks}</td>
                      <td className="p-4 text-slate-600">
                        {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => openEdit(exam)}
                            className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors"
                            title="Edit Exam">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(exam.id)}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                            title="Delete Exam">
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
        </main>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-slate-900 text-lg mb-5">
                {editingExam ? 'Edit Exam' : 'Add New Exam'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingExam && (
                  <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                    <span className="text-sm font-semibold text-blue-900">Create exam for all/selected subjects of this class</span>
                  </label>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    placeholder="e.g., Unit Test 1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                    <select value={form.class_id} onChange={e => handleClassChange(e.target.value)} required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                    </select>
                  </div>
                </div>

                {!bulkMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      {availableSubjects.length > 0 ? (
                        <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <option value="">Select subject</option>
                          {availableSubjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code || 'Sub'})</option>)}
                        </select>
                      ) : (
                        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
                          placeholder="e.g., Mathematics"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks</label>
                      <input type="number" value={form.max_marks} min={1} required
                        onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 0 })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks</label>
                      <input type="number" value={form.max_marks} min={1} required
                        onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 0 })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    {availableSubjects.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Subjects (leave empty for ALL):</label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                          {availableSubjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={selectedSubjects.includes(s.name)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedSubjects(prev => [...prev, s.name]);
                                  else setSelectedSubjects(prev => prev.filter(name => name !== s.name));
                                }}
                                className="accent-blue-600" />
                              {s.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                        No subjects configured for this class yet. Please add subjects from the Subjects tab first or switch off multi-subject mode.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Date</label>
                  <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeDialog}
                    className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingExam ? 'Update Exam' : 'Create Exam'}
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
