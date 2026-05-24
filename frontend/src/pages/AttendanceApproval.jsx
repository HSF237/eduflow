import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getSchoolByPrincipal, getClasses, getAttendanceByClass } from '@/lib/db';
import { ArrowLeft, Loader2, Calendar, Edit2, ChevronDown } from 'lucide-react';

const DATE_RANGES = [
  { label: 'Today', value: '0' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'All time', value: 'all' },
];

export default function AttendanceApproval() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('all');
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    if (!isLoadingAuth) loadData(authUser);
  }, [isLoadingAuth, authUser]);

  const loadData = async (user) => {
    try {
      if (!user) { navigate('/login?role=principal'); return; }
      const school = await getSchoolByPrincipal(user.uid);
      if (!school) { navigate(createPageUrl('SetupSchool')); return; }

      const cls = await getClasses(school.id);
      setClasses(cls);

      const attArrays = await Promise.all(cls.map(c => getAttendanceByClass(c.id)));
      const allAtt = attArrays.flat();

      const grouped = {};
      allAtt.forEach(a => {
        const key = `${a.date}__${a.class_id}`;
        if (!grouped[key]) grouped[key] = { date: a.date, class_id: a.class_id, records: [] };
        grouped[key].records.push(a);
      });

      setAllGroups(Object.values(grouped));
    } catch (err) {
      console.error('AttendanceApproval error:', err);
    }
    setLoading(false);
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '—';
  };

  const countStatus = (records, status) =>
    records.filter(r => (r.status || '').toLowerCase() === status).length;

  const getCutoff = () => {
    if (dateRange === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange));
    return d.toISOString().split('T')[0];
  };

  const filtered = allGroups
    .filter(g => {
      if (filterClass !== 'all' && g.class_id !== filterClass) return false;
      const cutoff = getCutoff();
      if (cutoff && g.date < cutoff) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return getClassName(a.class_id).localeCompare(getClassName(b.class_id));
    });

  // Group by date for display
  const byDate = filtered.reduce((acc, g) => {
    if (!acc[g.date]) acc[g.date] = [];
    acc[g.date].push(g);
    return acc;
  }, {});

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(createPageUrl('PrincipalDashboard'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-bold text-lg text-slate-800">Attendance Review</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Class filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Class:</span>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="all">All Classes</option>
              {classes
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                ))}
            </select>
          </div>

          <div className="ml-auto text-sm text-slate-500 font-medium">
            {filtered.length} session{filtered.length !== 1 ? 's' : ''} across {dates.length} day{dates.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Results */}
        {dates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">No attendance records found</p>
            <p className="text-sm mt-1">Try expanding the date range or selecting a different class.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map(date => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {byDate[date].length} class{byDate[date].length !== 1 ? 'es' : ''}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Class cards for this date */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byDate[date].map(group => {
                    const present = countStatus(group.records, 'present');
                    const absent = countStatus(group.records, 'absent');
                    const late = countStatus(group.records, 'late');
                    const total = group.records.length;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

                    return (
                      <div key={`${group.date}-${group.class_id}`}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-semibold text-slate-800 text-sm">{getClassName(group.class_id)}</p>
                          <button
                            onClick={() => navigate(`${createPageUrl('EditAttendance')}?date=${group.date}&classId=${group.class_id}`)}
                            className="flex items-center gap-1 text-xs border border-slate-200 text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>

                        {/* Attendance bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-slate-50 rounded-lg py-2">
                            <p className="text-sm font-bold text-slate-600">{total}</p>
                            <p className="text-[10px] text-slate-400">Total</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg py-2">
                            <p className="text-sm font-bold text-emerald-600">{present}</p>
                            <p className="text-[10px] text-emerald-600">Present</p>
                          </div>
                          <div className="bg-red-50 rounded-lg py-2">
                            <p className="text-sm font-bold text-red-600">{absent}</p>
                            <p className="text-[10px] text-red-600">Absent</p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg py-2">
                            <p className="text-sm font-bold text-yellow-600">{late}</p>
                            <p className="text-[10px] text-yellow-600">Late</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
