import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pbSignup, pb } from '@/lib/pocketbase';
import { createSchool, createClass, upsertTeacher, createStudent, sendMessage } from '@/lib/db';
import { Loader2, CheckCircle } from 'lucide-react';

export default function Seed() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSeed = async () => {
    setLoading(true);
    try {
      const email = 'zerox9861@gmail.com';
      const password = 'password123';
      
      console.log('Seeding data for', email);

      // 1. Create/Login the Admin User in PocketBase (if using PB)
      let userId = 'mock-admin-id';
      try {
        if (pb) {
           await pb.authStore.clear();
           try {
             const user = await pbSignup({ email, password, name: 'Super Admin', role: 'ADMIN' });
             userId = user.record.id;
           } catch (e) {
             // If exists, login
             const auth = await pb.collection('users').authWithPassword(email, password);
             userId = auth.record.id;
           }
        }
      } catch (err) {
        console.log('PB auth failed, proceeding with local mock ID', err);
      }

      // 2. Create School
      const school = await createSchool({
        name: 'Global International School',
        code: 'GIS' + Math.floor(Math.random() * 1000),
        address: '123 Tech Avenue',
        phone: '+1-555-0198',
        principal_id: userId,
        principal_email: email,
        academic_year_start: '2025-04-01',
        academic_year_end: '2026-03-31'
      });

      console.log('Created school:', school.id);

      // 3. Create Teacher Profile for Admin (so they have access to teacher views)
      await upsertTeacher({
        user_id: userId,
        school_id: school.id,
        name: 'Super Admin (Teacher)',
        email: email,
        designation: 'Principal & Head Teacher',
        subjects: ['Mathematics', 'Science']
      });

      // Create a dummy teacher
      await upsertTeacher({
        user_id: 'dummy-teacher-id',
        school_id: school.id,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        designation: 'Senior Teacher',
        subjects: ['English', 'History']
      });

      // 4. Create Classes
      const class10A = await createClass({
        school_id: school.id,
        name: '10',
        section: 'A',
        class_teacher_id: userId
      });

      const class10B = await createClass({
        school_id: school.id,
        name: '10',
        section: 'B',
        class_teacher_id: 'dummy-teacher-id',
        subject_teachers: [{ teacher_id: userId, subject: 'Math' }]
      });

      // 5. Add Students
      const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
      
      const createStudentsForClass = async (clsId, count) => {
        for (let i = 1; i <= count; i++) {
          const name = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
          const student = await createStudent({
            school_id: school.id,
            class_id: clsId,
            name: name,
            roll_number: i,
            admission_number: 'ADM-25' + clsId.substring(0, 3) + i,
            parent_name: 'Parent of ' + name.split(' ')[0],
            parent_email: 'parent' + i + '@example.com',
            gender: Math.random() > 0.5 ? 'Male' : 'Female'
          });

          // Send a welcome message
          await sendMessage({
            school_id: school.id,
            class_id: clsId,
            student_id: student.id,
            sender_type: 'teacher',
            sender_name: 'Super Admin',
            message: `Welcome to ${name}'s communication portal! Feel free to message me here.`,
            message_type: 'text'
          });
        }
      };

      await createStudentsForClass(class10A.id, 15);
      await createStudentsForClass(class10B.id, 15);

      setDone(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Seeding error:', err);
      alert('Error during seeding: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Seed Mock Data</h1>
        <p className="text-slate-600 text-sm">
          Click below to generate a School, Classes, Teachers, and 30 Students exclusively for <strong>zerox9861@gmail.com</strong>.
        </p>

        {done ? (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8" />
            <p className="font-semibold">Seeding Complete!</p>
            <p className="text-sm">Redirecting to login...</p>
            <p className="text-xs mt-2">Login with:<br/>Email: zerox9861@gmail.com<br/>Pass: password123</p>
          </div>
        ) : (
          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Generating Data...' : 'Seed Data Now'}
          </button>
        )}
      </div>
    </div>
  );
}
