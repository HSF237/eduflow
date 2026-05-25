import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, setDoc, serverTimestamp
} from 'firebase/firestore';

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
  const q = query(collection(db, 'schools'), where('principal_id', '==', userId));
  const s = await getDocs(q);
  return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() };
};
export const createSchool = async (data) => {
  const ref = await addDoc(collection(db, 'schools'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const updateSchool = async (id, data) => {
  await updateDoc(doc(db, 'schools', id), data);
  return { id, ...data };
};
export const getSchoolById = async (id) => {
  const d = await getDoc(doc(db, 'schools', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
};
export const getSchoolByCode = async (code) => {
  const q = query(collection(db, 'schools'), where('code', '==', code.toUpperCase()));
  const s = await getDocs(q);
  return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() };
};

// ── Classes ──────────────────────────────────────────────────────────────────
export const getClasses = async (schoolId) => {
  const q = query(collection(db, 'classes'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'name');
};
export const createClass = async (data) => {
  const ref = await addDoc(collection(db, 'classes'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
};
export const updateClass = async (id, data) => {
  await updateDoc(doc(db, 'classes', id), data);
  return { id, ...data };
};
export const deleteClass = async (id) => {
  await deleteDoc(doc(db, 'classes', id));
};
export const getClassByParentCode = async (code) => {
  const q = query(collection(db, 'classes'), where('parent_code', '==', code.toUpperCase()));
  const s = await getDocs(q);
  return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() };
};
export const getClassById = async (id) => {
  const d = await getDoc(doc(db, 'classes', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
};

// ── Teachers ──────────────────────────────────────────────────────────────────
export const getTeachers = async (schoolId) => {
  const q = query(collection(db, 'teachers'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'name');
};
export const getTeacherByUserId = async (userId) => {
  const q = query(collection(db, 'teachers'), where('user_id', '==', userId));
  const s = await getDocs(q);
  if (s.empty) return null;
  const teacher = { id: s.docs[0].id, ...s.docs[0].data() };
  if (teacher.school_id) {
    const schoolSnap = await getDoc(doc(db, 'schools', teacher.school_id));
    teacher.schools = snap(schoolSnap);
  }
  return teacher;
};
export const updateTeacher = async (id, data) => {
  await updateDoc(doc(db, 'teachers', id), data);
  return { id, ...data };
};
export const upsertTeacher = async (data) => {
  const q = query(collection(db, 'teachers'), where('user_id', '==', data.user_id));
  const s = await getDocs(q);
  if (s.empty) {
    const ref = await addDoc(collection(db, 'teachers'), { ...data, created_at: serverTimestamp() });
    return { id: ref.id, ...data };
  } else {
    await updateDoc(s.docs[0].ref, data);
    return { id: s.docs[0].id, ...data };
  }
};

// ── Students ──────────────────────────────────────────────────────────────────
export const getStudents = async (schoolId) => {
  const q = query(collection(db, 'students'), where('school_id', '==', schoolId));
  return sortBy(snapAll(await getDocs(q)), 'name');
};
export const getStudentsByClass = async (classId) => {
  const q = query(collection(db, 'students'), where('class_id', '==', classId));
  return sortBy(snapAll(await getDocs(q)), 'name');
};
export const getStudentByParentCode = async (code) => {
  const q = query(collection(db, 'students'), where('parent_code', '==', code.toUpperCase()));
  const s = await getDocs(q);
  return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() };
};
export const createStudent = async (data) => {
  const studentData = { parent_code: generateParentCode(), ...data, created_at: serverTimestamp() };
  const ref = await addDoc(collection(db, 'students'), studentData);
  return { id: ref.id, ...studentData };
};
export const updateStudent = async (id, data) => {
  await updateDoc(doc(db, 'students', id), data);
  return { id, ...data };
};
export const deleteStudent = async (id) => {
  await deleteDoc(doc(db, 'students', id));
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
  const q = query(collection(db, 'messages'), where('student_id', '==', studentId));
  return sortBy(snapAll(await getDocs(q)), 'created_at');
};
export const sendMessage = async (data) => {
  const ref = await addDoc(collection(db, 'messages'), { ...data, created_at: serverTimestamp() });
  return { id: ref.id, ...data };
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
