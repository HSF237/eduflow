import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import {
  getSchoolByPrincipal, getTeacherByUserId,
  getClasses, getSubjects, createSubject, updateSubject, deleteSubject,
} from "@/lib/db";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, BookOpen,
  X, GraduationCap, Search,
} from "lucide-react";

const SUBJECT_COLORS = [
  { name: "Indigo",  bg: "bg-indigo-100",  text: "text-indigo-700",  dot: "bg-indigo-500" },
  { name: "Blue",    bg: "bg-blue-100",     text: "text-blue-700",    dot: "bg-blue-500" },
  { name: "Emerald", bg: "bg-emerald-100",  text: "text-emerald-700", dot: "bg-emerald-500" },
  { name: "Rose",    bg: "bg-rose-100",     text: "text-rose-700",    dot: "bg-rose-500" },
  { name: "Amber",   bg: "bg-amber-100",    text: "text-amber-700",   dot: "bg-amber-500" },
  { name: "Purple",  bg: "bg-purple-100",   text: "text-purple-700",  dot: "bg-purple-500" },
  { name: "Teal",    bg: "bg-teal-100",     text: "text-teal-700",    dot: "bg-teal-500" },
  { name: "Orange",  bg: "bg-orange-100",   text: "text-orange-700",  dot: "bg-orange-500" },
];

const getColorConfig = (colorName) =>
  SUBJECT_COLORS.find((c) => c.name === colorName) || SUBJECT_COLORS[0];

const emptyForm = { name: "", code: "", class_id: "", color: "Indigo" };

export default function ManageSubjects() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterClass, setFilterClass] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const defaultClassId = urlParams.get("classId") || "";

  useEffect(() => { if (!isLoadingAuth) loadData(authUser); }, [isLoadingAuth, authUser]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (user) => {
    try {
      if (!user) { navigate(-1); return; }

      let targetSchoolId = null;
      let filteredClasses = [];

      const school = await getSchoolByPrincipal(user.uid).catch(() => null);
      if (school?.id) {
        targetSchoolId = school.id;
        const allCls = await getClasses(targetSchoolId);
        filteredClasses = allCls || [];
      } else {
        const teacher = await getTeacherByUserId(user.uid).catch(() => null);
        if (teacher?.school_id) {
          targetSchoolId = teacher.school_id;
          const allCls = await getClasses(targetSchoolId);
          const assigned = (allCls || []).filter(
            (c) => c.teacher_id === teacher.id || (teacher.assigned_classes || []).includes(c.id)
          );
          filteredClasses = assigned.length > 0 ? assigned : allCls || [];
        }
      }

      if (!targetSchoolId) {
        const ls = localStorage.getItem("default_created_school");
        if (ls) { try { targetSchoolId = JSON.parse(ls).id; } catch (e) {} }
      }
      if (!targetSchoolId) targetSchoolId = "super_admin_school";

      setSchoolId(targetSchoolId);
      setClasses(filteredClasses);

      const allSubjects = await getSubjects(targetSchoolId);
      setSubjects(allSubjects || []);
      if (defaultClassId) setFilterClass(defaultClassId);
    } catch (err) {
      console.error("ManageSubjects load error:", err);
    }
    setLoading(false);
  };

  const reloadSubjects = async () => {
    if (!schoolId) return;
    const updated = await getSubjects(schoolId);
    setSubjects(updated || []);
  };

  const openAdd = () => {
    setEditingSubject(null);
    setForm({ ...emptyForm, class_id: filterClass !== "all" ? filterClass : (classes[0]?.id || "") });
    setDialogOpen(true);
  };

  const openEdit = (subj) => {
    setEditingSubject(subj);
    setForm({ name: subj.name || "", code: subj.code || "", class_id: subj.class_id || "", color: subj.color || "Indigo" });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingSubject(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Subject name is required", "error"); return; }
    if (!form.class_id) { showToast("Please select a class", "error"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        class_id: form.class_id,
        school_id: schoolId,
        color: form.color,
      };
      if (editingSubject) {
        await updateSubject(editingSubject.id, payload);
        showToast("Subject updated");
      } else {
        await createSubject(payload);
        showToast("Subject added");
      }
      await reloadSubjects();
      closeDialog();
    } catch (err) {
      console.error(err);
      showToast("Failed to save subject", "error");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"? Existing exams won't be affected.`)) return;
    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      showToast("Subject deleted");
    } catch (err) {
      showToast("Failed to delete", "error");
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.name}${cls.section ? " - " + cls.section : ""}` : "\u2014";
  };

  const filtered = subjects.filter((s) => {
    const matchClass = filterClass === "all" || s.class_id === filterClass;
    const term = search.toLowerCase();
    const matchSearch = !term || (s.name || "").toLowerCase().includes(term) || (s.code || "").toLowerCase().includes(term);
    return matchClass && matchSearch;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Manage Subjects</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-xs bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
              {filtered.length} subject{filtered.length !== 1 ? "s" : ""}
            </span>
            <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-7">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Search subjects\u2026" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
          </div>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 w-full sm:w-52">
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ""}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-800 font-semibold text-lg mb-1">No subjects yet</p>
            <p className="text-slate-400 text-sm mb-6">Add subjects to link them to exams and marks entry</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Add First Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((subj) => {
              const color = getColorConfig(subj.color);
              return (
                <div key={subj.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 ${color.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <div className={`w-5 h-5 rounded-full ${color.dot}`} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(subj)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(subj.id, subj.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900 text-base leading-tight mb-1">{subj.name}</p>
                  {subj.code && (
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                      {subj.code}
                    </span>
                  )}
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 flex-shrink-0" />
                    {getClassName(subj.class_id)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingSubject ? "Edit Subject" : "Add New Subject"}</h2>
              <button onClick={closeDialog} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject Name *</label>
                <input type="text" required placeholder="e.g., Mathematics" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject Code</label>
                  <input type="text" placeholder="e.g., MATH" value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Class *</label>
                  <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Color Tag</label>
                <div className="flex flex-wrap gap-2.5">
                  {SUBJECT_COLORS.map((c) => (
                    <button key={c.name} type="button"
                      onClick={() => setForm({ ...form, color: c.name })}
                      className={`w-8 h-8 rounded-full ${c.dot} transition-all ${form.color === c.name ? "ring-2 ring-offset-2 ring-slate-500 scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"}`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeDialog}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSubject ? "Update Subject" : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
