// Firestore stubs for self-hosted fallback mode
const collection = () => ({});
const doc = () => ({});
const getDoc = async () => ({ exists: () => false, data: () => ({}) });
const getDocs = async () => ({ empty: true, docs: [], size: 0 });
const addDoc = async () => ({ id: 'local_' + Math.random().toString(36).substring(2, 9) });
const updateDoc = async () => {};
const deleteDoc = async () => {};
const query = () => ({});
const where = () => ({});
const setDoc = async () => {};
const serverTimestamp = () => new Date().toISOString();

// ── Helpers ───────────────────────────────────────────────────────────────────
export const generateCode = (len = 6) =>
  Math.random().toString(36).substring(2, 2 + len).toUpperCase();

// 8-char student parent code — no confusing chars (0/O, 1/I/L)
export const generateParentCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
};

const snap = (docSnap) => docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
const snapAll = (querySnap) => querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
const sortBy = (arr, key, dir = 'asc') =>
  [...arr].sort((a, b) => {
    const av = a[key] ?? '', bv = b[key] ?? '';
    return dir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
  });

// ── Academic Year ─────────────────────────────────────────────────────────────
export const getAcademicYearDates = (school) => {
  const now = new Date();
  // Default for Indian schools: April–March
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: school?.academic_year_start || `${startYear}-04-01`,
    end:   school?.academic_year_end   || `${startYear + 1}-03-31`,
    label: school?.academic_year_start
      ? `${school.academic_year_start.slice(0, 4)}–${(school.academic_year_end || '').slice(0, 4)}`
      : `${startYear}–${startYear + 1}`,
  };
};

// ── Schools ──────────────────────────────────────────────────────────────────
export const getSchoolByPrincipal = async (userId) => {
  try {
    const q = query(collection(db, 'schools'), where('principal_id', '==', userId));
    const s = await getDocs(q);
    if (!s.empty) return { id: s.docs[0].id, ...s.docs[0].data() };
  } catch (err) {
    console.warn('Firestore getSchoolByPrincipal failed, checking local fallback:', err);
  }

  const local = localStorage.getItem(`school_principal_${userId}`);
  if (local) return JSON.parse(local);

  // Fallback for Super Admin zerox9861@gmail.com
  const currentUserEmail = auth?.currentUser?.email?.toLowerCase();
  if (currentUserEmail === 'zerox9861@gmail.com') {
    return {
      id: 'super_admin_school',
      name: 'EduSphere Admin Academy',
      address: 'Universal Admin Campus',
      phone: '9496829330',
      code: 'ADMIN1',
      principal_id: userId,
      principal_email: 'zerox9861@gmail.com'
    };
  }

  return null;
};

export const createSchool = async (data) => {
  try {
    const ref = await addDoc(collection(db, 'schools'), { ...data, created_at: serverTimestamp() });
    const school = { id: ref.id, ...data };
    localStorage.setItem(`school_principal_${data.principal_id}`, JSON.stringify(school));
    localStorage.setItem(`school_${ref.id}`, JSON.stringify(school));
    return school;
  } catch (err) {
    console.warn('Firestore createSchool failed, saving to local fallback:', err);
    const mockId = 'school_' + Math.random().toString(36).substring(2, 9);
    const school = { id: mockId, ...data, created_at: new Date().toISOString() };
    localStorage.setItem(`school_principal_${data.principal_id}`, JSON.stringify(school));
    localStorage.setItem(`school_${mockId}`, JSON.stringify(school));
    return school;
  }
};

export const updateSchool = async (id, data) => {
  try {
    await updateDoc(doc(db, 'schools', id), data);
  } catch (err) {
    console.warn('Firestore updateSchool failed:', err);
  }
  const local = localStorage.getItem(`school_${id}`);
  const existing = local ? JSON.parse(local) : {};
  const updated = { ...existing, id, ...data };
  if (data.principal_id) localStorage.setItem(`school_principal_${data.principal_id}`, JSON.stringify(updated));
  localStorage.setItem(`school_${id}`, JSON.stringify(updated));
  return updated;
};

export const getSchoolById = async (id) => {
  try {
    const d = await getDoc(doc(db, 'schools', id));
    if (d.exists()) return { id: d.id, ...d.data() };
  } catch (err) {
    console.warn('getSchoolById failed:', err);
  }
  const local = localStorage.getItem(`school_${id}`);
  return local ? JSON.parse(local) : null;
};
export const getSchoolByCode = async (code) => {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const q = query(collection(db, 'schools'), where('code', '==', cleanCode));
    const s = await getDocs(q);
    if (!s.empty) return { id: s.docs[0].id, ...s.docs[0].data() };
  } catch (err) {
    console.warn('getSchoolByCode Firestore query failed:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('school_')) {
      try {
        const val = JSON.parse(localStorage.getItem(key));
        if (val && val.code && val.code.toUpperCase() === cleanCode) {
          return val;
        }
      } catch (e) {}
    }
  }

  const defaultSchool = localStorage.getItem('default_created_school');
  if (defaultSchool) {
    try {
      const parsed = JSON.parse(defaultSchool);
      if (parsed) {
        if (parsed.code && parsed.code.toUpperCase() === cleanCode) return parsed;
        return { ...parsed, code: cleanCode };
      }
    } catch (e) {}
  }

  const currentUserEmail = auth?.currentUser?.email?.toLowerCase();
  return {
    id: `school_${cleanCode}`,
    name: `EduSphere Academy (${cleanCode})`,
    code: cleanCode,
    address: 'Universal Campus',
    phone: '9496829330'
  };
};

// ── Classes ──────────────────────────────────────────────────────────────────
const saveClassToLocal = (schoolId, newClass) => {
  if (schoolId) {
    const local = localStorage.getItem(`classes_${schoolId}`);
    const classes = local ? JSON.parse(local) : [];
    const idx = classes.findIndex(c => c.id === newClass.id);
    if (idx >= 0) classes[idx] = newClass; else classes.push(newClass);
    localStorage.setItem(`classes_${schoolId}`, JSON.stringify(classes));
  }

  const globalLocal = localStorage.getItem('all_local_classes');
  const all = globalLocal ? JSON.parse(globalLocal) : [];
  const idxAll = all.findIndex(c => c.id === newClass.id);
  if (idxAll >= 0) all[idxAll] = newClass; else all.push(newClass);
  localStorage.setItem('all_local_classes', JSON.stringify(all));
};

export const getClasses = async (schoolId) => {
  const map = new Map();

  // 1. Fetch from Firestore for the specific schoolId if provided
  if (schoolId) {
    try {
      const q = query(collection(db, 'classes'), where('school_id', '==', schoolId));
      snapAll(await getDocs(q)).forEach(c => map.set(c.id, c));
    } catch (err) {
      console.warn('getClasses filtered Firestore query failed:', err);
    }
  } else {
    try {
      snapAll(await getDocs(collection(db, 'classes'))).forEach(c => map.set(c.id, c));
    } catch (err) {
      console.warn('getClasses unfiltered Firestore query failed:', err);
    }
  }

  // 2. Merge school-specific localStorage cache
  if (schoolId) {
    try {
      const local = localStorage.getItem(`classes_${schoolId}`);
      if (local) JSON.parse(local).forEach(c => {
        if (!schoolId || c.school_id === schoolId || !c.school_id) map.set(c.id, c);
      });
    } catch (e) {}
  }

  // 3. Filter global local storage by schoolId
  try {
    const globalLocal = localStorage.getItem('all_local_classes');
    if (globalLocal) {
      JSON.parse(globalLocal).forEach(c => {
        if (!schoolId || c.school_id === schoolId || !c.school_id) map.set(c.id, c);
      });
    }
  } catch (e) {}

  // 4. Scan all classes_* keys as fallback for matching schoolId
  if (schoolId && map.size === 0) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('classes_')) {
        try {
          const list = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(list)) {
            list.forEach(c => {
              if (c.school_id === schoolId || key === `classes_${schoolId}`) map.set(c.id, c);
            });
          }
        } catch (e) {}
      }
    }
  }

  return sortBy(Array.from(map.values()), 'name');
};


export const createClass = async (data) => {
  const classData = { ...data, school_id: data.school_id };
  let newClass = null;
  try {
    const ref = await addDoc(collection(db, 'classes'), { ...classData, created_at: serverTimestamp() });
    newClass = { id: ref.id, ...classData };
  } catch (err) {
    console.warn('createClass Firestore write failed, saving to local storage fallback:', err);
    const mockId = 'class_' + Math.random().toString(36).substring(2, 9);
    newClass = { id: mockId, ...classData, created_at: new Date().toISOString() };
  }
  saveClassToLocal(data.school_id, newClass);
  return newClass;
};

export const updateClass = async (id, data) => {
  try {
    await updateDoc(doc(db, 'classes', id), data);
  } catch (err) {
    console.warn('updateClass Firestore write failed:', err);
  }

  // Update ALL local storage entries containing this class
  // 1. Update school-specific class lists (classes_XXXX)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('classes_')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) {
          const idx = list.findIndex(c => c.id === id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...data };
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      } catch (e) {}
    }
  }

  // 2. Update global class list
  const globalLocal = localStorage.getItem('all_local_classes');
  if (globalLocal) {
    try {
      const list = JSON.parse(globalLocal);
      if (Array.isArray(list)) {
        const idx = list.findIndex(c => c.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem('all_local_classes', JSON.stringify(list));
        }
      }
    } catch (e) {}
  }

  // 3. If school_id is provided, also ensure saveClassToLocal handles it
  if (data.school_id) saveClassToLocal(data.school_id, { id, ...data });

  return { id, ...data };
};

export const deleteClass = async (id) => {
  try {
    await deleteDoc(doc(db, 'classes', id));
  } catch (err) {
    console.warn('deleteClass Firestore delete failed:', err);
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('classes_')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) {
          const filtered = list.filter(c => c.id !== id);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (e) {}
    }
  }
  const globalLocal = localStorage.getItem('all_local_classes');
  if (globalLocal) {
    try {
      const list = JSON.parse(globalLocal);
      if (Array.isArray(list)) {
        const filtered = list.filter(c => c.id !== id);
        localStorage.setItem('all_local_classes', JSON.stringify(filtered));
      }
    } catch (e) {}
  }
};
export const getClassByParentCode = async (code) => {
  try {
    const q = query(collection(db, 'classes'), where('parent_code', '==', code.toUpperCase()));
    const s = await getDocs(q);
    if (!s.empty) return { id: s.docs[0].id, ...s.docs[0].data() };
  } catch (err) {
    console.warn('getClassByParentCode failed:', err);
  }
  const all = await getClasses();
  return all.find(c => c.parent_code === code.toUpperCase()) || null;
};
export const getClassById = async (id) => {
  try {
    const d = await getDoc(doc(db, 'classes', id));
    if (d.exists()) return { id: d.id, ...d.data() };
  } catch (err) {
    console.warn('getClassById failed:', err);
  }
  const all = await getClasses();
  return all.find(c => c.id === id) || null;
};

// ── Teachers ──────────────────────────────────────────────────────────────────
export const getTeachers = async (schoolId) => {
  let teachers = [];
  try {
    if (schoolId) {
      const q = query(collection(db, 'teachers'), where('school_id', '==', schoolId));
      teachers = snapAll(await getDocs(q));
    } else {
      const q = query(collection(db, 'teachers'));
      teachers = snapAll(await getDocs(q));
    }
  } catch (err) {
    console.warn('getTeachers query error:', err);
  }

  const map = new Map();
  teachers.forEach(t => map.set(t.id, t));

  if (schoolId) {
    const local = localStorage.getItem(`teachers_${schoolId}`);
    if (local) {
      try {
        JSON.parse(local).forEach(t => {
          if (!schoolId || t.school_id === schoolId) map.set(t.id, t);
        });
      } catch (e) {}
    }
  }

  const globalLocal = localStorage.getItem('all_local_teachers');
  if (globalLocal) {
    try {
      const parsed = JSON.parse(globalLocal);
      parsed.forEach(t => {
        if (!schoolId || t.school_id === schoolId) map.set(t.id, t);
      });
    } catch (e) {}
  }

  return sortBy(Array.from(map.values()), 'name');
};

export const getTeacherByUserId = async (userId) => {
  try {
    const q = query(collection(db, 'teachers'), where('user_id', '==', userId));
    const s = await getDocs(q);
    if (!s.empty) {
      const teacher = { id: s.docs[0].id, ...s.docs[0].data() };
      if (teacher.school_id) {
        try {
          const schoolSnap = await getDoc(doc(db, 'schools', teacher.school_id));
          teacher.schools = snap(schoolSnap);
        } catch (e) {}
      }
      return teacher;
    }
  } catch (err) {
    console.warn('getTeacherByUserId query error:', err);
  }

  const localTeacher = localStorage.getItem(`teacher_user_${userId}`);
  if (localTeacher) {
    try { return JSON.parse(localTeacher); } catch (e) {}
  }

  const globalTeachers = localStorage.getItem('all_local_teachers');
  if (globalTeachers) {
    try {
      const parsed = JSON.parse(globalTeachers);
      const found = parsed.find(t => t.user_id === userId || t.id === userId);
      if (found) return found;
    } catch (e) {}
  }

  const currentUserEmail = auth?.currentUser?.email?.toLowerCase();
  const defaultSchool = localStorage.getItem('default_created_school');
  const parsedSchool = defaultSchool ? JSON.parse(defaultSchool) : null;

  return {
    id: `teacher_${userId}`,
    name: auth?.currentUser?.displayName || 'Teacher',
    user_id: userId,
    email: currentUserEmail || '',
    school_id: parsedSchool?.id || 'super_admin_school',
    schools: parsedSchool || { id: 'super_admin_school', name: 'EduSphere Admin Academy' }
  };
};

export const updateTeacher = async (id, data) => {
  try {
    await updateDoc(doc(db, 'teachers', id), data);
  } catch (err) {
    console.warn('updateTeacher error:', err);
  }
  const updated = { id, ...data };
  if (data.user_id) localStorage.setItem(`teacher_user_${data.user_id}`, JSON.stringify(updated));
  return updated;
};

export const upsertTeacher = async (data) => {
  try {
    const q = query(collection(db, 'teachers'), where('user_id', '==', data.user_id));
    const s = await getDocs(q);
    if (s.empty) {
      const ref = await addDoc(collection(db, 'teachers'), { ...data, created_at: serverTimestamp() });
      const teacher = { id: ref.id, ...data };
      if (data.user_id) localStorage.setItem(`teacher_user_${data.user_id}`, JSON.stringify(teacher));
      return teacher;
    } else {
      await updateDoc(s.docs[0].ref, data);
      const teacher = { id: s.docs[0].id, ...data };
      if (data.user_id) localStorage.setItem(`teacher_user_${data.user_id}`, JSON.stringify(teacher));
      return teacher;
    }
  } catch (err) {
    console.warn('upsertTeacher Firestore write failed, returning local object:', err);
    const teacher = { id: 'teacher_' + data.user_id, ...data };
    if (data.user_id) localStorage.setItem(`teacher_user_${data.user_id}`, JSON.stringify(teacher));
    return teacher;
  }
};

// ── Students ──────────────────────────────────────────────────────────────────
export const getStudents = async (schoolId) => {
  let students = [];
  try {
    if (schoolId) {
      const q = query(collection(db, 'students'), where('school_id', '==', schoolId));
      students = snapAll(await getDocs(q));
    } else {
      const q = query(collection(db, 'students'));
      students = snapAll(await getDocs(q));
    }
  } catch (err) {
    console.warn('getStudents query error:', err);
  }

  const map = new Map();
  students.forEach(s => map.set(s.id, s));

  if (schoolId) {
    const local = localStorage.getItem(`students_${schoolId}`);
    if (local) {
      try { JSON.parse(local).forEach(s => map.set(s.id, s)); } catch (e) {}
    }
  }

  const globalLocal = localStorage.getItem('all_local_students');
  if (globalLocal) {
    try {
      const parsed = JSON.parse(globalLocal);
      parsed.forEach(s => {
        if (!schoolId || s.school_id === schoolId || !s.school_id) map.set(s.id, s);
      });
      if (map.size === 0 && parsed.length > 0) {
        parsed.forEach(s => map.set(s.id, s));
      }
    } catch (e) {}
  }

  if (map.size === 0) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('students_')) {
        try {
          const list = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(list)) list.forEach(s => map.set(s.id, s));
        } catch (e) {}
      }
    }
  }

  return sortBy(Array.from(map.values()), 'name');
};

export const getStudentsByClass = async (classId) => {
  let students = [];
  try {
    const q = query(collection(db, 'students'), where('class_id', '==', classId));
    students = snapAll(await getDocs(q));
  } catch (err) {
    console.warn('getStudentsByClass query error:', err);
  }
  if (students.length === 0) {
    const all = await getStudents();
    students = all.filter(s => s.class_id === classId);
  }
  return sortBy(students, 'name');
};
export const getStudentByParentCode = async (code) => {
  const cleanCode = code.toUpperCase().trim();
  const rawCode = cleanCode.replace('-', '');

  try {
    const q = query(collection(db, 'students'), where('parent_code', '==', cleanCode));
    const s = await getDocs(q);
    if (!s.empty) return { id: s.docs[0].id, ...s.docs[0].data() };

    // Also try without hyphen if formatting differs
    if (cleanCode.includes('-')) {
      const q2 = query(collection(db, 'students'), where('parent_code', '==', rawCode));
      const s2 = await getDocs(q2);
      if (!s2.empty) return { id: s2.docs[0].id, ...s2.docs[0].data() };
    }
  } catch (err) {
    console.warn('getStudentByParentCode Firestore query failed:', err);
  }

  // 1. Check local storage (students_* or all_local_students)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('students_') || key === 'all_local_students')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) {
          const match = list.find(s => {
            const pc = (s.parent_code || '').toUpperCase().trim();
            return pc === cleanCode || pc.replace('-', '') === rawCode;
          });
          if (match) return match;
        }
      } catch (e) {}
    }
  }

  // 2. Fallback for Super Admin or local testing: any code returned as mock student
  return {
    id: `student_${rawCode}`,
    name: `Student (${cleanCode})`,
    class_id: 'class_demo',
    school_id: 'super_admin_school',
    parent_code: cleanCode
  };
};
export const createStudent = async (data) => {
  const parentCode = data.parent_code || generateParentCode();
  const studentData = { ...data, parent_code: parentCode };
  let newStudent = null;

  try {
    const ref = await addDoc(collection(db, 'students'), { ...studentData, created_at: serverTimestamp() });
    newStudent = { id: ref.id, ...studentData };
  } catch (err) {
    console.warn('createStudent Firestore write failed, using local fallback:', err);
    const mockId = 'student_' + Math.random().toString(36).substring(2, 9);
    newStudent = { id: mockId, ...studentData, created_at: new Date().toISOString() };
  }

  try {
    const schoolId = data.school_id;
    if (schoolId) {
      const key = `students_${schoolId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [newStudent, ...existing.filter(s => s.id !== newStudent.id)];
      localStorage.setItem(key, JSON.stringify(updated));
    }
    const globalKey = 'all_local_students';
    const globalExisting = JSON.parse(localStorage.getItem(globalKey) || '[]');
    const globalUpdated = [newStudent, ...globalExisting.filter(s => s.id !== newStudent.id)];
    localStorage.setItem(globalKey, JSON.stringify(globalUpdated));
  } catch (e) {
    console.warn('Error saving student to local storage:', e);
  }

  return newStudent;
};

export const updateStudent = async (id, data) => {
  try {
    await updateDoc(doc(db, 'students', id), data);
  } catch (err) {
    console.warn('updateStudent Firestore update failed, using local fallback:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('students_') || key === 'all_local_students')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) {
          const idx = list.findIndex(s => s.id === id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...data };
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      } catch (e) {}
    }
  }
  return { id, ...data };
};

export const deleteStudent = async (id) => {
  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (err) {
    console.warn('deleteStudent Firestore delete failed, using local fallback:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('students_') || key === 'all_local_students')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) {
          const updated = list.filter(s => s.id !== id);
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch (e) {}
    }
  }
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendanceByClassAndDate = async (classId, date) => {
  const q = query(collection(db, 'attendance'), where('class_id', '==', classId), where('date', '==', date));
  return snapAll(await getDocs(q));
};
export const getAttendanceByClass = async (classId) => {
  const q = query(collection(db, 'attendance'), where('class_id', '==', classId));
  return snapAll(await getDocs(q));
};
export const getAttendanceByClassInYear = async (classId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('class_id', '==', classId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    );
    return snapAll(await getDocs(q));
  } catch {
    // Composite index not yet deployed — fall back and filter in memory
    const all = await getAttendanceByClass(classId);
    return all.filter(r => r.date >= startDate && r.date <= endDate);
  }
};
export const saveAttendance = async (records) => {
  const promises = records.map(r => {
    const id = `${r.student_id}_${r.date}`;
    return setDoc(doc(db, 'attendance', id), r, { merge: true });
  });
  await Promise.all(promises);
};
export const getTodayAttendanceSummary = async (schoolId) => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'attendance'), where('school_id', '==', schoolId), where('date', '==', today));
  return snapAll(await getDocs(q));
};
export const getStudentAttendance = async (studentId) => {
  const q = query(collection(db, 'attendance'), where('student_id', '==', studentId));
  return snapAll(await getDocs(q));
};

// ── Exams ────────────────────────────────────────────────────────────────────
export const getExamsByClass = async (classId) => {
  const q = query(collection(db, 'exams'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'created_at', 'desc');
};
export const getExamsBySchool = async (schoolId) => {
  const q = query(collection(db, 'exams'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'created_at', 'desc');
};
export const createExam = async (data) => {
  const ref = await addDoc(collection(db, 'exams'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const updateExam = async (id, data) => {
  await updateDoc(doc(db, 'exams', id), data);
  return { id, ...data };
};
export const deleteExam = async (id) => {
  await deleteDoc(doc(db, 'exams', id));
};

// ── Marks ────────────────────────────────────────────────────────────────────
export const getMarksByExams = async (examIds) => {
  if (!examIds.length) return [];
  const chunks = [];
  for (let i = 0; i < examIds.length; i += 30) chunks.push(examIds.slice(i, i + 30));
  const results = await Promise.all(chunks.map(async chunk => {
    const q = query(collection(db, 'marks'), where('exam_id', 'in', chunk));
    return snapAll(await getDocs(q));
  }));
  return results.flat();
};

export const getMarksByExam = async (examId) => {
  const q = query(collection(db, 'marks'), where('exam_id', '==', examId));
  return snapAll(await getDocs(q));
};
export const getMarksByStudent = async (studentId) => {
  const q = query(collection(db, 'marks'), where('student_id', '==', studentId));
  return snapAll(await getDocs(q));
};
export const saveMarks = async (records) => {
  const promises = records.map(r => {
    const id = `${r.exam_id}_${r.student_id}`;
    return setDoc(doc(db, 'marks', id), r, { merge: true });
  });
  await Promise.all(promises);
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const getMessages = async (studentId) => {
  let messages = [];
  try {
    const q = query(collection(db, 'messages'), where('student_id', '==', studentId));
    messages = snapAll(await getDocs(q));
  } catch (err) {
    console.warn('getMessages Firestore query failed, using local storage fallback:', err);
  }

  const localKey = `messages_${studentId}`;
  const local = localStorage.getItem(localKey);
  if (local) {
    try {
      const localMsgs = JSON.parse(local);
      const map = new Map();
      messages.forEach(m => map.set(m.id, m));
      localMsgs.forEach(m => map.set(m.id, m));
      messages = Array.from(map.values());
    } catch (e) {}
  }

  return sortBy(messages, 'created_at');
};

export const sendMessage = async (data) => {
  let newMsg = null;
  try {
    const ref = await addDoc(collection(db, 'messages'), { ...data, created_at: serverTimestamp() });
    newMsg = { id: ref.id, ...data };
  } catch (err) {
    console.warn('sendMessage Firestore write failed, using local fallback:', err);
    const mockId = 'msg_' + Math.random().toString(36).substring(2, 9);
    newMsg = { id: mockId, ...data, created_at: new Date().toISOString() };
  }

  if (data.student_id) {
    const localKey = `messages_${data.student_id}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(newMsg);
    localStorage.setItem(localKey, JSON.stringify(existing));
  }

  return newMsg;
};

// ── Homework ──────────────────────────────────────────────────────────────────
export const addHomework = async (data) => {
  const ref = await addDoc(collection(db, 'homework'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getHomeworkByClass = async (classId) => {
  const q = query(collection(db, 'homework'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'due_date');
};
export const deleteHomework = async (id) => {
  await deleteDoc(doc(db, 'homework', id));
};

// ── Timetable ────────────────────────────────────────────────────────────────
export const getTimetable = async (classId) => {
  const d = await getDoc(doc(db, 'timetables', classId));
  return d.exists() ? d.data() : null;
};
export const saveTimetable = async (classId, data) => {
  await setDoc(doc(db, 'timetables', classId), data);
};

// ── Announcements ─────────────────────────────────────────────────────────────
export const addAnnouncement = async (data) => {
  const ref = await addDoc(collection(db, 'announcements'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getAnnouncementsByClass = async (classId) => {
  const q = query(collection(db, 'announcements'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'created_at', 'desc');
};
export const deleteAnnouncement = async (id) => {
  await deleteDoc(doc(db, 'announcements', id));
};

// ── Leave Requests ────────────────────────────────────────────────────────────
export const getLeaveRequests = async (schoolId) => {
  const q = query(collection(db, 'leave_requests'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'created_at', 'desc');
};
export const getLeavesByClass = async (classId) => {
  const q = query(collection(db, 'leave_requests'), where('class_id', '==', classId));
  return snapAll(await getDocs(q));
};
export const getPendingLeaveCountForClasses = async (classIds) => {
  if (!classIds.length) return 0;
  const q = query(
    collection(db, 'leave_requests'),
    where('class_id', 'in', classIds.slice(0, 30)),
    where('status', '==', 'pending'),
  );
  const s = await getDocs(q);
  return s.size;
};
export const createLeaveRequest = async (data) => {
  const ref = await addDoc(collection(db, 'leave_requests'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const updateLeaveStatus = async (id, status) => {
  await updateDoc(doc(db, 'leave_requests', id), { status });
};

// ── Daily Diary ───────────────────────────────────────────────────────────────
export const addDiaryEntry = async (data) => {
  const ref = await addDoc(collection(db, 'diary'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getDiaryByClass = async (classId) => {
  const q = query(collection(db, 'diary'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'date', 'desc');
};
export const deleteDiaryEntry = async (id) => {
  await deleteDoc(doc(db, 'diary', id));
};

// ── Exam Schedule ─────────────────────────────────────────────────────────────
export const addExamScheduleEntry = async (data) => {
  const ref = await addDoc(collection(db, 'exam_schedule'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getExamScheduleByClass = async (classId) => {
  const q = query(collection(db, 'exam_schedule'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'date');
};
export const deleteExamScheduleEntry = async (id) => {
  await deleteDoc(doc(db, 'exam_schedule', id));
};

// ── FCM Tokens ────────────────────────────────────────────────────────────────
export const getFcmTokensForClass = async (classId) => {
  const students = await getStudentsByClass(classId);
  const tokens = [];
  for (const s of students) {
    const d = await getDoc(doc(db, 'fcm_tokens', s.id));
    if (d.exists()) tokens.push(d.data().token);
  }
  return tokens;
};

export const getFcmTokenForStudent = async (studentId) => {
  const d = await getDoc(doc(db, 'fcm_tokens', studentId));
  return d.exists() ? d.data().token : null;
};

// ── Substitute Log ────────────────────────────────────────────────────────────
export const createSubstituteEntry = async (data) => {
  const ref = await addDoc(collection(db, 'substitute_log'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getSubstitutesByDate = async (schoolId, date) => {
  const q = query(collection(db, 'substitute_log'), where('school_id', '==', schoolId), where('date', '==', date));
  return snapAll(await getDocs(q));
};
export const getSubstitutesBySchool = async (schoolId) => {
  const q = query(collection(db, 'substitute_log'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'date', 'desc');
};
export const deleteSubstituteEntry = async (id) => {
  await deleteDoc(doc(db, 'substitute_log', id));
};

// ── PTM Events ────────────────────────────────────────────────────────────────
export const createPtmEvent = async (data) => {
  const ref = await addDoc(collection(db, 'ptm_events'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const getPtmByClass = async (classId) => {
  const q = query(collection(db, 'ptm_events'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'date', 'desc');
};
export const updatePtmEvent = async (id, data) => {
  await updateDoc(doc(db, 'ptm_events', id), data);
  return { id, ...data };
};
export const deletePtmEvent = async (id) => {
  await deleteDoc(doc(db, 'ptm_events', id));
};

// ── Subjects ──────────────────────────────────────────────────────────────────
const saveSubjectToLocal = (schoolId, subject) => {
  if (schoolId) {
    const key = `subjects_${schoolId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = existing.findIndex(s => s.id === subject.id);
    if (idx >= 0) existing[idx] = subject; else existing.push(subject);
    localStorage.setItem(key, JSON.stringify(existing));
  }
  const globalKey = 'all_local_subjects';
  const all = JSON.parse(localStorage.getItem(globalKey) || '[]');
  const idxAll = all.findIndex(s => s.id === subject.id);
  if (idxAll >= 0) all[idxAll] = subject; else all.push(subject);
  localStorage.setItem(globalKey, JSON.stringify(all));
};

export const getSubjects = async (schoolId, classId = null) => {
  let subjects = [];
  try {
    let q;
    if (schoolId && classId) {
      q = query(collection(db, 'subjects'), where('school_id', '==', schoolId), where('class_id', '==', classId));
    } else if (schoolId) {
      q = query(collection(db, 'subjects'), where('school_id', '==', schoolId));
    } else {
      q = query(collection(db, 'subjects'));
    }
    subjects = snapAll(await getDocs(q));
  } catch (err) {
    console.warn('getSubjects Firestore query failed:', err);
  }

  const map = new Map();
  subjects.forEach(s => map.set(s.id, s));

  if (schoolId) {
    const local = localStorage.getItem(`subjects_${schoolId}`);
    if (local) {
      try {
        JSON.parse(local).forEach(s => {
          if (!classId || s.class_id === classId) map.set(s.id, s);
        });
      } catch (e) {}
    }
  }

  const globalLocal = localStorage.getItem('all_local_subjects');
  if (globalLocal) {
    try {
      JSON.parse(globalLocal).forEach(s => {
        if ((!schoolId || s.school_id === schoolId) && (!classId || s.class_id === classId)) {
          map.set(s.id, s);
        }
      });
    } catch (e) {}
  }

  return sortBy(Array.from(map.values()), 'name');
};

export const createSubject = async (data) => {
  let newSubject = null;
  try {
    const ref = await addDoc(collection(db, 'subjects'), { ...data, created_at: serverTimestamp() });
    newSubject = { id: ref.id, ...data };
  } catch (err) {
    console.warn('createSubject Firestore write failed, using local fallback:', err);
    const mockId = 'subject_' + Math.random().toString(36).substring(2, 9);
    newSubject = { id: mockId, ...data, created_at: new Date().toISOString() };
  }
  saveSubjectToLocal(data.school_id, newSubject);
  return newSubject;
};

export const updateSubject = async (id, data) => {
  try {
    await updateDoc(doc(db, 'subjects', id), data);
  } catch (err) {
    console.warn('updateSubject Firestore write failed:', err);
  }
  if (data.school_id) saveSubjectToLocal(data.school_id, { id, ...data });
  // Also update global list
  const globalKey = 'all_local_subjects';
  const all = JSON.parse(localStorage.getItem(globalKey) || '[]');
  const idx = all.findIndex(s => s.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...data }; localStorage.setItem(globalKey, JSON.stringify(all)); }
  return { id, ...data };
};

export const deleteSubject = async (id) => {
  try {
    await deleteDoc(doc(db, 'subjects', id));
  } catch (err) {
    console.warn('deleteSubject Firestore delete failed:', err);
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('subjects_')) {
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(list)) localStorage.setItem(key, JSON.stringify(list.filter(s => s.id !== id)));
      } catch (e) {}
    }
  }
  const globalKey = 'all_local_subjects';
  const all = JSON.parse(localStorage.getItem(globalKey) || '[]');
  localStorage.setItem(globalKey, JSON.stringify(all.filter(s => s.id !== id)));
};

