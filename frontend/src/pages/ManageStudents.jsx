import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  getStudents, getClasses, createStudent, updateStudent, deleteStudent,
  getSchoolByPrincipal, generateParentCode,
} from '@/lib/db';
import {
  ArrowLeft, Plus, Loader2, Users, Trash2, Edit2, Search,
  Copy, RefreshCw, Check, KeyRound,
} from 'lucide-react';

const getEngagementBadge = (score) => {
  const s = score ?? 100;
  if (s >= 75) return { label: `${s}%`, cls: 'bg-green-100 text-green-700' };
  if (s >= 50) return { label: `${s}%`, cls: 'bg-yellow-100 text-yellow-700' };
  return { label: `${s}%`, cls: 'bg-red-100 text-red-700' };
};

export default function ManageStudents() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const emptyForm = { name: '', roll_number: '', admission_number: '', class_id: '', parent_name: '', dob: '' };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { if (!isLoadingAuth) loadData(authUser); }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate(-1); return; }
      const school = await getSchoolByPrincipal(user.uid);
      if (!school) { navigate(-1); return; }
      setSchoolId(school.id);
      const [studentData, classData] = await Promise.all([
        getStudents(school.id), getClasses(school.id),
      ]);
      setStudents(studentData);
      setClasses(classData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => { setEditingStudent(null); setFormData(emptyForm); setDialogOpen(true); };
  const openEditDialog = (s) => {
    setEditingStudent(s);
    setFormData({ name: s.name || '', roll_number: s.roll_number || '', admission_number: s.admission_number || '', class_id: s.class_id || '', parent_name: s.parent_name || '', dob: s.dob || '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingStudent(null); setFormData(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      const sharedFields = {
        name: formData.name.trim(), roll_number: formData.roll_number.trim(),
        admission_number: formData.admission_number.trim(),
        class_id: formData.class_id || null, parent_name: formData.parent_name.trim(),
        dob: formData.dob || null,
      };
      if (editingStudent) {
        await updateStudent(editingStudent.id, sharedFields);
      } else {
        await createStudent({ school_id: schoolId, ...sharedFields, engagement_score: 100, status: 'Active' });
      }
      await loadData(authUser);
      closeDialog();
    } catch (err) {
      console.error('Error saving student:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try { await deleteStudent(studentId); await loadData(authUser); }
    catch (err) { console.error('Error deleting student:', err); }
  };

  const copyCode = (student) => {
    const code = student.parent_code || '—';
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const regenerateCode = async (student) => {
    if (!window.confirm(`Generate a new parent code for ${student.name}? The old code will stop working.`)) return;
    setRegeneratingId(student.id);
    try {
      const newCode = generateParentCode();
      await updateStudent(student.id, { parent_code: newCode });
      await loadData(authUser);
    } catch (err) {
      console.error('Error regenerating code:', err);
    }
    setRegeneratingId(null);
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || (s.name || '').toLowerCase().includes(term) || (s.roll_number || '').toLowerCase().includes(term) || (s.admission_number || '').toLowerCase().includes(term);
    const matchClass = filterClass === 'all' || s.class_id === filterClass;
    return matchSearch && matchClass;
  });

  const getClassName = (student) => {
    if (student.classes) { const { name, section } = student.classes; return section ? `${name} - ${section}` : name; }
    const cls = classes.find((c) => c.id === student.class_id);
    return cls ? (cls.section ? `${cls.name} - ${cls.section}` : cls.name) : '—';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Manage Students</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search students..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 w-full sm:w-44">
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ''}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button onClick={openAddDialog}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>

        {/* Info banner */}
        <div className="mb-4 flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-700">
          <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Each student has a unique <strong>Parent Code</strong>. Share it with the parent so they can log in and view only their child's data.</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Roll</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Class</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Parent</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">
                    <span className="flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Parent Code</span>
                  </th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Score</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-14">
                    <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 text-sm">No students found</p>
                  </td></tr>
                ) : filteredStudents.map((student) => {
                  const badge = getEngagementBadge(student.engagement_score);
                  const isCopied = copiedId === student.id;
                  const isRegen = regeneratingId === student.id;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-900 whitespace-nowrap">{student.name}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{student.roll_number || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{getClassName(student)}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{student.parent_name || '—'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded tracking-widest">
                            {student.parent_code || '—'}
                          </span>
                          {student.parent_code ? (
                            <>
                              <button onClick={() => copyCode(student)} title="Copy code"
                                className="p-1 rounded hover:bg-gray-100 transition-colors">
                                {isCopied
                                  ? <Check className="w-3.5 h-3.5 text-green-600" />
                                  : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                              </button>
                              <button onClick={() => regenerateCode(student)} title="Generate new code" disabled={isRegen}
                                className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50">
                                <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isRegen ? 'animate-spin' : ''}`} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => regenerateCode(student)} title="Generate code"
                              className="text-xs text-purple-600 hover:underline">
                              Generate
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button onClick={() => openEditDialog(student)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors mr-1" title="Edit">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(student.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStudents.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 px-1">
            Showing {filteredStudents.length} of {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      {/* Add / Edit Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDialog} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h2>

            {/* Show code for existing student */}
            {editingStudent?.parent_code && (
              <div className="mb-5 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                <KeyRound className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-medium mb-0.5">Parent Code</p>
                  <p className="font-mono font-bold text-purple-800 tracking-widest">{editingStudent.parent_code}</p>
                </div>
                <button onClick={() => copyCode(editingStudent)} className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                  {copiedId === editingStudent.id
                    ? <Check className="w-4 h-4 text-green-600" />
                    : <Copy className="w-4 h-4 text-purple-500" />}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Name *', key: 'name', placeholder: "Student's full name", required: true },
                { label: 'Roll No', key: 'roll_number', placeholder: 'e.g., 01' },
                { label: 'Admission No', key: 'admission_number', placeholder: 'e.g., ADM2024001' },
                { label: 'Parent Name', key: 'parent_name', placeholder: 'Parent or guardian name' },
              ].map(({ label, key, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input type="text" placeholder={placeholder} value={formData[key]} required={required}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                <input type="date" value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                <select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeDialog}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStudent ? 'Update' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
