import { db } from './firebase';
import {
  collection, addDoc, setDoc, doc, getDocs,
  query, where, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { generateCode } from './db';

const CLASSES = [
  { name: 'Class 6', section: 'A' },
  { name: 'Class 7', section: 'A' },
  { name: 'Class 7', section: 'B' },
  { name: 'Class 8', section: 'A' },
  { name: 'Class 9', section: 'B' },
  { name: 'Class 10', section: 'A' },
];

const STUDENTS = [
  // Class 6A
  ['Aarav Sharma', '01', 'ADM001'], ['Zara Ahmed', '02', 'ADM002'], ['Mohammed Ali', '03', 'ADM003'],
  ['Priya Nair', '04', 'ADM004'], ['Rahul Kumar', '05', 'ADM005'], ['Fatima Hassan', '06', 'ADM006'],
  ['Arjun Patel', '07', 'ADM007'],
  // Class 7A
  ['Nadia Khan', '01', 'ADM011'], ['Vikram Singh', '02', 'ADM012'], ['Aisha Malik', '03', 'ADM013'],
  ['Rohan Gupta', '04', 'ADM014'], ['Sara Hussain', '05', 'ADM015'], ['Karan Mehta', '06', 'ADM016'],
  // Class 7B
  ['Hana Ibrahim', '01', 'ADM021'], ['Ankit Joshi', '02', 'ADM022'], ['Layla Omar', '03', 'ADM023'],
  ['Suresh Rao', '04', 'ADM024'], ['Maryam Ansari', '05', 'ADM025'],
  // Class 8A
  ['Deepak Verma', '01', 'ADM031'], ['Zaynab Ali', '02', 'ADM032'], ['Amith Reddy', '03', 'ADM033'],
  ['Riya Chopra', '04', 'ADM034'], ['Kabir Das', '05', 'ADM035'], ['Noor Fatima', '06', 'ADM036'],
  // Class 9B
  ['Siddharth Iyer', '01', 'ADM041'], ['Yasmin Sheikh', '02', 'ADM042'], ['Aryan Bose', '03', 'ADM043'],
  ['Hira Qureshi', '04', 'ADM044'], ['Tanvir Ahmed', '05', 'ADM045'],
  // Class 10A
  ['Divya Menon', '01', 'ADM051'], ['Omar Farooq', '02', 'ADM052'], ['Sneha Pillai', '03', 'ADM053'],
  ['Bilal Siddiqui', '04', 'ADM054'], ['Anjali Singh', '05', 'ADM055'], ['Yusuf Ali', '06', 'ADM056'],
];

const PARENT_NAMES = [
  'Ramesh Sharma', 'Khalid Ahmed', 'Tariq Ali', 'Sunil Nair', 'Arun Kumar',
  'Hamid Hassan', 'Vinod Patel', 'Imran Khan', 'Rajesh Singh', 'Karim Malik',
  'Sanjay Gupta', 'Rizwan Hussain', 'Manoj Mehta', 'Khaleel Ibrahim', 'Prakash Joshi',
  'Faisal Omar', 'Venkat Rao', 'Shakeel Ansari', 'Vijay Verma', 'Nasim Ali',
  'Ravi Reddy', 'Naresh Chopra', 'Pramod Das', 'Salim Fatima', 'Krishnan Iyer',
  'Javed Sheikh', 'Sudipta Bose', 'Tariq Qureshi', 'Imtiaz Ahmed', 'Mohan Menon',
  'Abdul Farooq', 'Krishnakumar Pillai', 'Saleem Siddiqui', 'Harish Singh', 'Mustafa Ali', 'Samuel Yusuf',
];

const EXAMS = [
  { name: 'Unit Test 1', type: 'UT', max_marks: 25 },
  { name: 'Unit Test 2', type: 'UT', max_marks: 25 },
  { name: 'Periodic Test', type: 'Periodic Test', max_marks: 50 },
  { name: 'Half Yearly', type: 'Half Yearly', max_marks: 100 },
];

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Computer Science'];

const ATTENDANCE_STATUSES = ['present', 'present', 'present', 'present', 'present', 'absent', 'late'];

export const seedDemoData = async (schoolId) => {
  const today = new Date();

  // ── Step 1: Create classes ──────────────────────────────────────────────────
  const classIds = [];
  for (const cls of CLASSES) {
    const ref = await addDoc(collection(db, 'classes'), {
      school_id: schoolId,
      name: cls.name,
      section: cls.section,
      parent_code: generateCode(6),
      created_at: serverTimestamp(),
    });
    classIds.push(ref.id);
  }

  // ── Step 2: Create students ─────────────────────────────────────────────────
  const studentsPerClass = [7, 6, 5, 6, 5, 6];
  const allStudents = [];
  let sIdx = 0;

  for (let ci = 0; ci < classIds.length; ci++) {
    for (let i = 0; i < studentsPerClass[ci]; i++) {
      const [name, roll, adm] = STUDENTS[sIdx] || [`Student ${sIdx + 1}`, `${i + 1}`, `ADM${sIdx}`];
      const ref = await addDoc(collection(db, 'students'), {
        school_id: schoolId,
        class_id: classIds[ci],
        name,
        roll_number: roll,
        admission_number: adm,
        parent_name: PARENT_NAMES[sIdx] || 'Parent Name',
        engagement_score: Math.floor(Math.random() * 30) + 70,
        status: 'Active',
        created_at: serverTimestamp(),
      });
      allStudents.push({ id: ref.id, class_id: classIds[ci] });
      sIdx++;
    }
  }

  // ── Step 3: Attendance for last 30 school days ──────────────────────────────
  const attBatch = [];
  for (let d = 59; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];

    for (const { id: studentId, class_id } of allStudents) {
      const status = ATTENDANCE_STATUSES[Math.floor(Math.random() * ATTENDANCE_STATUSES.length)];
      attBatch.push(
        setDoc(doc(db, 'attendance', `${studentId}_${dateStr}`), {
          school_id: schoolId,
          class_id,
          student_id: studentId,
          date: dateStr,
          status,
          marked_by: 'demo-seed',
        }, { merge: true })
      );
    }
  }
  // Run attendance in chunks to avoid overload
  for (let i = 0; i < attBatch.length; i += 50) {
    await Promise.all(attBatch.slice(i, i + 50));
  }

  // ── Step 4: Create exams (3 per class) ─────────────────────────────────────
  const allExams = [];
  for (let ci = 0; ci < classIds.length; ci++) {
    for (let e = 0; e < 3; e++) {
      const examDef = EXAMS[e];
      const subject = SUBJECTS[(ci + e) % SUBJECTS.length];
      const examDate = new Date(today);
      examDate.setDate(examDate.getDate() - (e + 1) * 14);
      const ref = await addDoc(collection(db, 'exams'), {
        school_id: schoolId,
        class_id: classIds[ci],
        name: examDef.name,
        type: examDef.type,
        subject,
        max_marks: examDef.max_marks,
        exam_date: examDate.toISOString().split('T')[0],
        created_at: serverTimestamp(),
      });
      allExams.push({ id: ref.id, class_id: classIds[ci], max_marks: examDef.max_marks });
    }
  }

  // ── Step 5: Create marks ────────────────────────────────────────────────────
  const marksBatch = [];
  for (const exam of allExams) {
    const classStudents = allStudents.filter(s => s.class_id === exam.class_id);
    for (const { id: studentId } of classStudents) {
      const obtained = Math.floor(Math.random() * (exam.max_marks * 0.45)) + Math.floor(exam.max_marks * 0.5);
      marksBatch.push(
        setDoc(doc(db, 'marks', `${exam.id}_${studentId}`), {
          exam_id: exam.id,
          student_id: studentId,
          school_id: schoolId,
          marks_obtained: obtained,
        }, { merge: true })
      );
    }
  }
  await Promise.all(marksBatch);

  return { classes: classIds.length, students: allStudents.length };
};

export const clearAllSchoolData = async (schoolId) => {
  const COLLECTIONS = ['classes', 'students', 'attendance', 'exams', 'marks', 'messages', 'leave_requests'];

  for (const col of COLLECTIONS) {
    const q = query(collection(db, col), where('school_id', '==', schoolId));
    const snap = await getDocs(q);
    if (snap.empty) continue;
    // Delete in chunks of 50
    const refs = snap.docs.map(d => d.ref);
    for (let i = 0; i < refs.length; i += 50) {
      await Promise.all(refs.slice(i, i + 50).map(r => deleteDoc(r)));
    }
  }
};
