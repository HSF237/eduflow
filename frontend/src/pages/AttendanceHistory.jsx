import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getClassById, getStudentsByClass, getAttendanceByClass } from '@/lib/db';
import { ArrowLeft, Loader2, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Download } from 'lucide-react';

export default function AttendanceHistory() {
  const navigate = useNavigate();
  const classId = new URLSearchParams(window.location.search).get('classId');

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (!classId) { navigate(createPageUrl('TeacherDashboard')); return; }
      const [cls, studs, att] = await Promise.all([
        getClassById(classId),
        getStudentsByClass(classId),
        getAttendanceByClass(classId),
      ]);
      setClassInfo(cls);
      setStudents(studs);
      setAttendance(att);
    } catch (err) {
      console.error('AttendanceHistory error:', err);
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    const datesInView = filteredDates.slice().sort((a, b) => new Date(a) - new Date(b));
    const sortedStudents = [...students].sort((a, b) => (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0));

    const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
    const headers = ['Roll No', 'Student Name', ...datesInView.map(fmtDate), 'Total Days', 'Present', 'Absent', 'Late', 'Attendance %'];

    const rows = sortedStudents.map(s => {
      const statuses = datesInView.map(date => {
        const rec = (grouped[date] || []).find(r => r.student_id === s.id);
        if (!rec) return '-';
        const st = (rec.status || '').toLowerCase();
        return st === 'present' ? 'P' : st === 'absent' ? 'A' : st === 'late' ? 'L' : rec.status[0]?.toUpperCase() || '-';
      });
      const counted = statuses.filter(x => x !== '-');
      const present = statuses.filter(x => x === 'P').length;
      const absent = statuses.filter(x => x === 'A').length;
      const late = statuses.filter(x => x === 'L').length;
      const pct = counted.length > 0 ? Math.round(((present + late) / counted.length) * 100) : 0;
      return [s.roll_number || '-', s.name, ...statuses, counted.length, present, absent, late, `${pct}%`];
    });

    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv, { type: 'text/csv;charset=utf-8;' }]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const monthLabel = selectedMonth === 'all' ? 'all' : new Date(2024, parseInt(selectedMonth), 1).toLocaleString('default', { month: 'long' });
    a.download = `attendance-${classInfo?.name || 'class'}-${monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const normalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const getStatusIcon = (status) => {
    const s = normalize(status);
    if (s === 'Present') return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (s === 'Absent') return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === 'Late') return <Clock className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-blue-600" />;
  };

  const getStatusColor = (status) => {
    const s = normalize(status);
    if (s === 'Present') return 'bg-emerald-100 text-emerald-700';
    if (s === 'Absent') return 'bg-red-100 text-red-700';
    if (s === 'Late') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStudentName = (studentId) => students.find(s => s.id === studentId)?.name || 'Unknown';

  const grouped = attendance.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const filteredDates = selectedMonth === 'all'
    ? sortedDates
    : sortedDates.filter(d => new Date(d).getMonth() === parseInt(selectedMonth));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800">Attendance History</h1>
            <p className="text-xs text-slate-500">
              {classInfo?.name}{classInfo?.section ? ` — Section ${classInfo.section}` : ''}
            </p>
          </div>
          <button
            onClick={downloadCSV}
            disabled={filteredDates.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Month filter */}
        <div className="mb-5">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[160px]"
          >
            <option value="all">All Months</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i}>
                {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        {/* Date groups */}
        <div className="space-y-4">
          {filteredDates.map(date => {
            const records = grouped[date];
            const present = records.filter(r => ['present', 'Present'].includes(r.status)).length;
            const absent = records.filter(r => ['absent', 'Absent'].includes(r.status)).length;
            const late = records.filter(r => ['late', 'Late'].includes(r.status)).length;
            const nonPresent = records.filter(r => !['present', 'Present'].includes(r.status));

            return (
              <div key={date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">P: {present}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">A: {absent}</span>
                    {late > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">L: {late}</span>}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {nonPresent.length === 0 ? (
                    <p className="text-center text-emerald-600 text-sm py-1">
                      <CheckCircle className="w-4 h-4 inline mr-1" />All students present
                    </p>
                  ) : (
                    nonPresent.map(record => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className="text-sm text-slate-700">{getStudentName(record.student_id)}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(record.status)}`}>
                          {normalize(record.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredDates.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No attendance records found</p>
          </div>
        )}
      </main>
    </div>
  );
}
