import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import {
  getSchoolByPrincipal, getTeacherByUserId,
  getClasses, getSubjects, createSubject, updateSubject, deleteSubject,
} from "@/lib/db";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, BookOpen,
  X, Search,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

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
    <AppLayout title="Manage Subjects">
      <div className="min-h-screen bg-slate-50">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
            {toast.msg}
          </div>
        )}

        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="font-bold text-slate-800 text-lg leading-tight">School Subjects</h1>
                <p className="text-xs text-slate-600 font-medium">Manage subject list by class</p>
              </div>
            </div>

            <button onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject name..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>

            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No subjects found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Click below to add a subject for your classes.</p>
              <button onClick={openAdd} className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add First Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const colorConfig = getColorConfig(s.color);
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${colorConfig.dot}`} />
                          <h3 className="font-bold text-slate-800 text-base">{s.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-colors" title="Edit Subject">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors" title="Delete Subject">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`px-2.5 py-1 rounded-lg font-bold ${colorConfig.bg} ${colorConfig.text}`}>
                          {getClassName(s.class_id)}
                        </span>
                        {s.code && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono font-semibold">
                            {s.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {dialogOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base">{editingSubject ? "Edit Subject" : "Add New Subject"}</h3>
                <button onClick={closeDialog} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Subject Name *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Mathematics, Science"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Class *</label>
                  <select required value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Select class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Subject Code (optional)</label>
                  <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. MATH101"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={closeDialog} className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingSubject ? "Update Subject" : "Add Subject"}
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
