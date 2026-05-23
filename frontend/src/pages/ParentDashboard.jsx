import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getStudentsByClass, getAttendanceByClass } from '@/lib/db';
import {
  GraduationCap, Users, Search, Bell, Calendar, LogOut, Loader2
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-pink-500',
  'bg-orange-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500'
];

function getStatus(pct) {
  if (pct >= 75) return { label: 'Good', color: 'bg-green-100 text-green-700' };
  if (pct >= 50) return { label: 'Average', color: 'bg-yellow-100 text-yellow-700' };
  return { label: 'At Risk', color: 'bg-red-100 text-red-700' };
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [classInfo, setClassInfo] = useState({ name: '' });

  const classId = localStorage.getItem('parent_class_id');
  const studentId = localStorage.getItem('parent_student_id');
  const studentName = localStorage.getItem('parent_student_name') || 'Parent';

  useEffect(() => {
    if (!classId) {
      navigate(createPageUrl('ParentLogin'));
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, attendanceData] = await Promise.all([
        getStudentsByClass(classId),
        getAttendanceByClass(classId)
      ]);

      // Build per-student attendance %
      const countMap = {};
      const totalMap = {};
      attendanceData.forEach(rec => {
        if (!totalMap[rec.student_id]) { totalMap[rec.student_id] = 0; countMap[rec.student_id] = 0; }
        totalMap[rec.student_id]++;
        if (rec.status === 'present' || rec.status === 'late') countMap[rec.student_id]++;
      });

      const pctMap = {};
      studentsData.forEach(s => {
        const total = totalMap[s.id] || 0;
        const present = countMap[s.id] || 0;
        pctMap[s.id] = total > 0 ? Math.round((present / total) * 100) : 100;
      });

      setStudents(studentsData);
      setAttendanceMap(pctMap);
      setSelectedId(studentId);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_class_id');
    localStorage.removeItem('parent_student_id');
    localStorage.removeItem('parent_school_id');
    localStorage.removeItem('parent_student_name');
    navigate(createPageUrl('RoleSelection'));
  };

  const filtered = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || String(s.roll_number).includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-white" />
            <div>
              <span className="text-white font-bold text-lg leading-none">{studentName}</span>
              {classInfo.name && (
                <p className="text-purple-200 text-xs">{classInfo.name}</p>
              )}
            </div>
          </div>

          {/* Right nav */}
          <nav className="flex items-center gap-6">
            <button
              onClick={() => navigate(createPageUrl('ViewMarks'))}
              className="text-white text-sm font-medium hover:text-purple-200 transition-colors"
            >
              View Marks
            </button>
            <button
              onClick={() => navigate(createPageUrl('Communication'))}
              className="text-white text-sm font-medium hover:text-purple-200 transition-colors flex items-center gap-1"
            >
              <Bell className="w-4 h-4" />
              Messages
            </button>
            <button
              onClick={() => navigate(createPageUrl('ApplyLeave'))}
              className="text-white text-sm font-medium hover:text-purple-200 transition-colors flex items-center gap-1"
            >
              <Calendar className="w-4 h-4" />
              Apply Leave
            </button>
            <button
              onClick={handleLogout}
              className="text-white hover:text-purple-200 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Heading */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-800">
            Class Students ({students.length})
          </h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
        </div>

        {/* Student cards */}
        <div className="space-y-3">
          {filtered.map((student, idx) => {
            const pct = attendanceMap[student.id] ?? 100;
            const engagement = Math.max(0, pct - Math.floor(Math.random() * 5));
            const status = getStatus(pct);
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const isSelected = selectedId === student.id;

            return (
              <div
                key={student.id}
                onClick={() => setSelectedId(isSelected ? null : student.id)}
                className={`bg-white rounded-xl border-2 px-5 py-4 cursor-pointer transition-all flex items-center gap-4 ${
                  isSelected ? 'border-purple-400 shadow-md' : 'border-slate-100 hover:border-purple-200 shadow-sm'
                }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor}`}>
                  {student.roll_number}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 truncate">{student.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Attendance {pct}%
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Engagement {engagement}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No students found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
