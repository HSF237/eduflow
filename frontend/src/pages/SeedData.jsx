import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, setDoc, doc, getDocs,
  query, where, serverTimestamp, writeBatch,
} from 'firebase/firestore';

// ── seed data pools ───────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Ananya','Anjali','Ankit','Arjun','Aryan','Bhavya','Chirag',
  'Deepa','Devika','Dhruv','Divya','Farhan','Gaurav','Harsh','Ishaan','Jiya','Kabir',
  'Kavya','Kiran','Krish','Lakshmi','Manav','Meera','Mihir','Muskan','Nandini','Naveen',
  'Neha','Nikhil','Nisha','Om','Pallavi','Parth','Pooja','Pranav','Priya','Rahul',
  'Raj','Riya','Rohit','Sachin','Saisha','Sakshi','Sana','Sara','Shivam','Shreya',
  'Siddharth','Simran','Sneha','Soham','Sonal','Suresh','Tanvi','Tarun','Uday','Varun',
  'Vidya','Vikram','Vini','Yash','Zara','Aman','Bhumi','Chetan','Darshan','Esha',
  'Fatima','Govind','Himani','Ishan','Juhi','Kartik','Lata','Manan','Naman','Omkar',
  'Payal','Qasim','Radhika','Ruchika','Sagar','Tanya','Utkarsh','Vandana','Wasim','Yamini',
  'Abhay','Bindu','Chhavi','Dimple','Ekta','Faisal','Garima','Hetal','Ira','Jatin',
  'Komal','Lalit','Maya','Nilesh','Ojas',
];
const LAST_NAMES = [
  'Sharma','Verma','Gupta','Singh','Kumar','Patel','Joshi','Mehta','Rao','Nair',
  'Iyer','Reddy','Agarwal','Mishra','Pandey','Shah','Malhotra','Chauhan','Sinha','Tiwari',
];
const PARENT_NAMES = [
  'Rajesh','Sunita','Pradeep','Anita','Vikram','Geeta','Suresh','Kavita','Anil','Shobha',
  'Mahesh','Rekha','Dinesh','Usha','Ramesh','Sushma','Naresh','Meena','Girish','Asha',
];
const SUBJECTS = ['Math','English','Science','Hindi','Social Studies','Computer','Art','PE','Sanskrit'];

const HOMEWORK_POOL = [
  { subject:'Math', title:'Chapter 5 – Fractions (Q1–15)', description:'Show full working.' },
  { subject:'Math', title:'Practice worksheet – Decimals', description:'Complete both sides.' },
  { subject:'Math', title:'Geometry: Draw shapes & label', description:'Use ruler and compass.' },
  { subject:'Math', title:'Tables 12 to 20 – revise & write', description:'' },
  { subject:'English', title:'Write a paragraph on "My Best Day"', description:'Min 100 words.' },
  { subject:'English', title:'Chapter 6 comprehension questions', description:'Answers in full sentences.' },
  { subject:'English', title:'Learn spellings – Unit 4 list', description:'Test on Friday.' },
  { subject:'English', title:'Grammar – Tenses worksheet', description:'Fill in the blanks.' },
  { subject:'Science', title:'Draw the water cycle with labels', description:'Use colour pencils.' },
  { subject:'Science', title:'Chapter 3 Q&A – Animals', description:'Write in own words.' },
  { subject:'Science', title:'Collect 5 leaves and paste in notebook', description:'Label each leaf.' },
  { subject:'Hindi', title:'निबंध लेखन – मेरा विद्यालय (100 शब्द)', description:'' },
  { subject:'Hindi', title:'पाठ 4 के प्रश्न-उत्तर', description:'पूरे वाक्यों में लिखें।' },
  { subject:'Social Studies', title:'Map of India – mark states & capitals', description:'Use textbook pg 45.' },
  { subject:'Social Studies', title:'Chapter 7 – Short notes on democracy', description:'' },
  { subject:'Computer', title:'Draw flowchart for making tea', description:'Use correct symbols.' },
  { subject:'Computer', title:'Revise MS Word shortcuts', description:'Test on Thursday.' },
];

const ANNOUNCEMENTS_POOL = [
  { title:'School closed on Monday – Eid holiday', body:'School will remain closed on Monday 26th May. Regular classes resume Tuesday.' },
  { title:'Parent-Teacher Meeting – Saturday 31st May', body:'PTM will be held from 9 AM to 1 PM. All parents are requested to attend.' },
  { title:'Annual Sports Day – 5th June', body:'Students must bring white sports shoes. Practice sessions start this week.' },
  { title:'Fee payment reminder', body:'Please ensure term 2 fees are paid before 30th May to avoid late charges.' },
  { title:'School picnic – next Friday', body:'Permission slips must be submitted by Wednesday. Bus departs at 7 AM sharp.' },
  { title:'Science exhibition on 10th June', body:'Students may bring working models. Registration closes this Friday.' },
  { title:'Revised exam timetable issued', body:'Please check the updated schedule on the notice board or school website.' },
  { title:'Half-day on Wednesday – Teacher training', body:'School dismissal at 12:30 PM on Wednesday. Lunch will not be served.' },
  { title:'Yoga Day celebration – 21st June', body:'All students to wear white dress. Event starts at 8 AM in the playground.' },
  { title:'Library books return deadline', body:'All borrowed books must be returned by Friday to avoid loss of deposit.' },
];

const LEAVE_REASONS = [
  'High fever and cold, doctor advised rest for 3 days.',
  'Family wedding, travelling outstation.',
  'Stomach ache and vomiting since morning.',
  'Grandmother is unwell, need to visit hospital.',
  'Medical check-up appointment at district hospital.',
  'Severe headache, unable to attend school.',
  'Dengue fever, doctor prescribed one week rest.',
  'Out of town for cousin\'s engagement ceremony.',
  'Chicken pox – doctor advised home isolation.',
  'Urgent family matter, need to travel to village.',
  'Accident, minor injury on leg, needs rest.',
  'Viral infection, running temperature 102°F.',
];

const TEACHER_MESSAGES = [
  'Please revise Chapter 4 for the upcoming test.',
  'Your child missed today\'s class test. Please ensure attendance.',
  'Excellent behaviour in class today. Keep it up!',
  'Homework was incomplete today. Please ensure it is done.',
  'Kindly sign the exam result slip and send it back tomorrow.',
  'Your child has been selected for the school quiz team.',
  'Please bring Rs. 50 for the art material by Friday.',
  'Attendance is below 75%. Please be regular.',
  'Your child performed very well in the science project.',
  'PTM is scheduled this Saturday at 10 AM. Please attend.',
];

// ── helpers ───────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

const generateParentCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
};

const getPastDates = (n) => {
  const dates = [];
  const d = new Date();
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // skip weekends
      dates.push(d.toISOString().split('T')[0]);
      count++;
    }
  }
  return dates;
};

const getFutureDates = (n) => {
  const dates = [];
  const d = new Date();
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split('T')[0]);
      count++;
    }
  }
  return dates;
};

const randomAttendanceStatus = () => {
  const r = Math.random();
  if (r < 0.72) return 'Present';
  if (r < 0.87) return 'Absent';
  return 'Late';
};

const TIMETABLE_SUBJECTS = {
  Mon: ['Math','English','Science','Hindi','Social Studies','Computer','Art','PE'],
  Tue: ['Hindi','Math','English','Computer','Science','Art','Social Studies','PE'],
  Wed: ['Science','Hindi','Math','Social Studies','English','PE','Computer','Art'],
  Thu: ['English','Science','Social Studies','Math','Hindi','Art','PE','Computer'],
  Fri: ['Computer','Math','Hindi','English','Art','Science','Social Studies','PE'],
  Sat: ['PE','Social Studies','Science','Hindi','Math','English','',''],
};

// ── main component ────────────────────────────────────────────────────────────

export default function SeedData() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const seed = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      // 1. Find all schools
      addLog('🔍 Finding schools...');
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      if (schoolsSnap.empty) {
        addLog('❌ No school found. Set up your school first, then run seed.');
        setRunning(false);
        return;
      }
      const schools = schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      addLog(`✅ Found ${schools.length} school(s): ${schools.map(s => s.name).join(', ')}`);

      // 2. Find all classes
      addLog('🔍 Finding classes...');
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (classes.length === 0) {
        addLog('❌ No classes found. Create at least one class first.');
        setRunning(false);
        return;
      }
      addLog(`✅ Found ${classes.length} class(es): ${classes.map(c => `${c.name}${c.section ? '-'+c.section:''}`).join(', ')}`);

      // 3. Find teachers
      addLog('🔍 Finding teachers...');
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      addLog(`✅ Found ${teachers.length} teacher(s)`);

      // 4. Distribute 103 students across classes
      const TARGET = 103;
      const perClass = Math.floor(TARGET / classes.length);
      const remainder = TARGET % classes.length;

      addLog(`\n👨‍🎓 Creating ${TARGET} students across ${classes.length} class(es)...`);

      let nameIndex = 0;
      const allStudents = []; // { id, classId, schoolId, name }

      for (let ci = 0; ci < classes.length; ci++) {
        const cls = classes[ci];
        const count = perClass + (ci < remainder ? 1 : 0);
        const school = schools.find(s => s.id === cls.school_id) || schools[0];
        const teacher = teachers.find(t => t.id === cls.teacher_id) || teachers[0];

        // Check existing students to avoid duplicates
        const existingSnap = await getDocs(query(collection(db, 'students'), where('class_id', '==', cls.id)));
        const existingCount = existingSnap.size;
        const toCreate = Math.max(0, count - existingCount);
        let rollStart = existingCount + 1;

        addLog(`  Class "${cls.name}${cls.section ? '-'+cls.section:''}": ${existingCount} existing, creating ${toCreate} more`);

        // Existing students also go into allStudents for attendance/leave seeding
        existingSnap.docs.forEach(d => {
          allStudents.push({ id: d.id, classId: cls.id, schoolId: school.id, teacherId: teacher?.id, teacherName: teacher?.name, name: d.data().name, classObj: cls });
        });

        for (let i = 0; i < toCreate; i++) {
          const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
          const lastName = pick(LAST_NAMES);
          nameIndex++;
          const name = `${firstName} ${lastName}`;
          const parentName = `${pick(PARENT_NAMES)} ${lastName}`;
          const rollNumber = rollStart + i;
          const parentCode = generateParentCode();

          const ref = await addDoc(collection(db, 'students'), {
            name,
            roll_number: String(rollNumber),
            class_id: cls.id,
            school_id: school.id,
            parent_name: parentName,
            parent_phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            parent_code: parentCode,
            engagement_score: Math.floor(60 + Math.random() * 40),
            created_at: serverTimestamp(),
          });
          allStudents.push({ id: ref.id, classId: cls.id, schoolId: school.id, teacherId: teacher?.id, teacherName: teacher?.name, name, classObj: cls });
        }
        addLog(`  ✅ Class "${cls.name}${cls.section ? '-'+cls.section:''}": done`);
      }
      addLog(`✅ Total students ready: ${allStudents.length}`);

      // 5. Attendance for last 10 working days
      addLog(`\n📋 Creating attendance for last 10 working days...`);
      const pastDates = getPastDates(10);
      const BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const student of allStudents) {
        for (const date of pastDates) {
          const status = randomAttendanceStatus();
          const id = `${student.id}_${date}`;
          const ref = doc(db, 'attendance', id);
          batch.set(ref, {
            student_id: student.id,
            class_id: student.classId,
            school_id: student.schoolId,
            date,
            status,
          }, { merge: true });
          batchCount++;
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      if (batchCount > 0) await batch.commit();
      addLog(`✅ Attendance written: ${allStudents.length * 10} records`);

      // 6. Homework for each class
      addLog(`\n📚 Creating homework...`);
      const futureDates = getFutureDates(14);
      for (const cls of classes) {
        const school = schools.find(s => s.id === cls.school_id) || schools[0];
        const teacher = teachers.find(t => t.id === cls.teacher_id) || teachers[0];
        const picks = pickN(HOMEWORK_POOL, 8);
        for (let i = 0; i < picks.length; i++) {
          const hw = picks[i];
          await addDoc(collection(db, 'homework'), {
            class_id: cls.id,
            school_id: school.id,
            teacher_id: teacher?.id || '',
            subject: hw.subject,
            title: hw.title,
            description: hw.description,
            due_date: futureDates[i % futureDates.length],
            created_at: serverTimestamp(),
          });
        }
        addLog(`  ✅ ${picks.length} homework entries for "${cls.name}"`);
      }

      // 7. Announcements for each class
      addLog(`\n📢 Creating announcements...`);
      for (const cls of classes) {
        const school = schools.find(s => s.id === cls.school_id) || schools[0];
        const teacher = teachers.find(t => t.id === cls.teacher_id) || teachers[0];
        const picks = pickN(ANNOUNCEMENTS_POOL, 6);
        for (const ann of picks) {
          await addDoc(collection(db, 'announcements'), {
            class_id: cls.id,
            school_id: school.id,
            teacher_id: teacher?.id || '',
            teacher_name: teacher?.name || 'Teacher',
            title: ann.title,
            body: ann.body,
            created_at: serverTimestamp(),
          });
        }
        addLog(`  ✅ ${picks.length} announcements for "${cls.name}"`);
      }

      // 8. Leave requests (mix of pending/approved/rejected)
      addLog(`\n📝 Creating leave requests...`);
      const STATUSES = ['pending','pending','approved','approved','approved','rejected'];
      const allClassStudents = {};
      allStudents.forEach(s => {
        if (!allClassStudents[s.classId]) allClassStudents[s.classId] = [];
        allClassStudents[s.classId].push(s);
      });

      for (const cls of classes) {
        const school = schools.find(s => s.id === cls.school_id) || schools[0];
        const studs = allClassStudents[cls.id] || [];
        const picked = pickN(studs, Math.min(25, studs.length));
        for (const student of picked) {
          const reason = pick(LEAVE_REASONS);
          const fromIdx = Math.floor(Math.random() * 8);
          const fromDate = pastDates[fromIdx] || pastDates[0];
          const toDate = pastDates[Math.max(0, fromIdx - 1)] || fromDate;
          await addDoc(collection(db, 'leave_requests'), {
            class_id: cls.id,
            school_id: school.id,
            student_id: student.id,
            student_name: student.name,
            from_date: toDate < fromDate ? toDate : fromDate,
            to_date: fromDate,
            reason,
            status: pick(STATUSES),
            created_at: serverTimestamp(),
          });
        }
        addLog(`  ✅ ${picked.length} leave requests for "${cls.name}"`);
      }

      // 9. Messages (teacher → student)
      addLog(`\n💬 Creating messages...`);
      for (const student of pickN(allStudents, Math.min(40, allStudents.length))) {
        const msgs = pickN(TEACHER_MESSAGES, 3);
        for (const content of msgs) {
          await addDoc(collection(db, 'messages'), {
            student_id: student.id,
            class_id: student.classId,
            sender_type: 'teacher',
            sender_name: student.teacherName || 'Teacher',
            content,
            created_at: serverTimestamp(),
          });
        }
      }
      addLog(`✅ Messages created`);

      // 10. Timetable for each class
      addLog(`\n🗓️ Setting timetables...`);
      for (const cls of classes) {
        await setDoc(doc(db, 'timetables', cls.id), {
          ...TIMETABLE_SUBJECTS,
          period_count: 8,
        });
        addLog(`  ✅ Timetable set for "${cls.name}"`);
      }

      addLog(`\n🎉 SEEDING COMPLETE!`);
      addLog(`   • ${allStudents.length} students`);
      addLog(`   • ${allStudents.length * 10} attendance records (10 days)`);
      addLog(`   • Homework, announcements, leave requests, messages, timetables — all done.`);
      setDone(true);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      console.error(err);
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-green-400 font-mono p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">🌱 Data Seeder</h1>
        <p className="text-slate-400 text-sm mb-6">
          Seeds 103 students + 10 days attendance + homework + announcements + leaves + messages + timetables
          into your existing school/class setup.
        </p>

        {!running && !done && (
          <button onClick={seed}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors mb-6">
            ▶ Run Seed
          </button>
        )}

        {running && (
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-green-400 text-sm">Seeding in progress…</span>
          </div>
        )}

        {done && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-green-300 font-bold">Done! Navigate to your dashboard to see the data.</span>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-4 space-y-1 max-h-[60vh] overflow-y-auto text-sm">
          {log.length === 0 && <p className="text-slate-500">Log will appear here…</p>}
          {log.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </div>
    </div>
  );
}
