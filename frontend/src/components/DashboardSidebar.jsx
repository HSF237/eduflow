import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Users,
  UserPlus,
  History,
  BookMarked,
  MessageSquare,
  BarChart2,
  BookCopy,
  CalendarDays,
  Megaphone,
  BookOpen,
  CheckCircle,
  ClipboardList,
  UserCog,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Award,
  Sparkles,
  Layers,
  LogOut
} from 'lucide-react';

export default function DashboardSidebar({
  role = 'teacher',
  selectedClassId = '',
  pendingLeaves = 0,
  unreadMessages = 0,
  isOpen = false,
  onClose = () => {},
  teacherName = '',
  schoolName = '',
  studentName = '',
  onLogout = () => {},
  onAddChild = null
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isSuperAdmin } = useAuth();
  
  const showSuperBar = isSuperAdmin || user?.email?.toLowerCase() === 'zerox9861@gmail.com';
  const sidebarTopClass = showSuperBar ? 'top-10' : 'top-0';
  const sidebarHeightClass = showSuperBar ? 'h-[calc(100vh-40px)]' : 'h-screen';

  const currentPath = location.pathname.toLowerCase();

  // Define nav sections based on role
  const getNavSections = () => {
    if (role === 'teacher') {
      const isSubjectTeacher = localStorage.getItem('teacher_role') === 'subject_teacher';

      if (isSubjectTeacher) {
        return [
          {
            title: 'Subject Teacher Portal',
            items: [
              {
                label: 'Messages',
                path: createPageUrl('Communication'),
                icon: MessageSquare,
                badge: unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : null,
                badgeColor: 'bg-emerald-500 text-white',
                primary: true,
              },
              {
                label: 'Homework',
                path: createPageUrl('Homework'),
                icon: BookCopy,
              },
              {
                label: 'Enter Marks',
                path: `${createPageUrl('EnterMarks')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
                icon: FileText,
              },
            ],
          },
        ];
      }

      return [
        {
          title: 'Core Actions',
          items: [
            {
              label: "Mark Attendance",
              path: `${createPageUrl('MarkAttendance')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: ClipboardCheck,
              primary: true,
            },
            {
              label: 'Review Leave',
              path: createPageUrl('ReviewLeave'),
              icon: FileText,
              badge: pendingLeaves > 0 ? (pendingLeaves > 9 ? '9+' : pendingLeaves) : null,
              badgeColor: 'bg-red-500 text-white',
            },
            {
              label: 'Unapproved Absences',
              path: createPageUrl('UnapprovedAbsences'),
              icon: AlertTriangle,
            },
          ],
        },
        {
          title: 'Students & Attendance',
          items: [
            {
              label: 'View Students',
              path: `${createPageUrl('ViewStudents')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: Users,
            },
            {
              label: 'Add Students',
              path: `${createPageUrl('ManageStudents')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: UserPlus,
            },
            {
              label: 'Attendance History',
              path: `${createPageUrl('AttendanceHistory')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: History,
            },
            {
              label: 'Attendance Analytics',
              path: `${createPageUrl('AttendanceAnalytics')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: BarChart2,
            },
          ],
        },
        {
          title: 'Academics',
          items: [
            {
              label: 'Manage Exams',
              path: createPageUrl('TeacherManageExams'),
              icon: BookMarked,
            },
            {
              label: 'Subjects',
              path: `${createPageUrl('ManageSubjects')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: BookOpen,
            },
            {
              label: 'Enter Marks',
              path: `${createPageUrl('EnterMarks')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: FileText,
            },
            {
              label: 'Exam Schedule',
              path: `${createPageUrl('ExamSchedule')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: CalendarDays,
            },
          ],
        },
        {
          title: 'Communication & Log',
          items: [
            {
              label: 'Messages',
              path: createPageUrl('Communication'),
              icon: MessageSquare,
              badge: unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : null,
              badgeColor: 'bg-emerald-500 text-white',
            },
            {
              label: 'Homework',
              path: createPageUrl('Homework'),
              icon: BookCopy,
            },
            {
              label: 'Timetable',
              path: createPageUrl('Timetable'),
              icon: CalendarDays,
            },
            {
              label: 'Announcements',
              path: createPageUrl('Announcements'),
              icon: Megaphone,
            },
            {
              label: 'Daily Diary',
              path: createPageUrl('Diary'),
              icon: BookOpen,
            },
            {
              label: 'PTM Schedule',
              path: `${createPageUrl('PtmSchedule')}${selectedClassId ? `?classId=${selectedClassId}` : ''}`,
              icon: Users,
            },
          ],
        },
      ];
    } else if (role === 'principal') {
      return [
        {
          title: 'School Management',
          items: [
            {
              label: 'Manage Classes',
              path: createPageUrl('ManageClasses'),
              icon: BookOpen,
              primary: true,
            },
            {
              label: 'Manage Teachers',
              path: createPageUrl('ManageTeachers'),
              icon: UserCog,
            },
            {
              label: 'Manage Students',
              path: createPageUrl('ManageStudents'),
              icon: Users,
            },
            {
              label: 'Subjects',
              path: createPageUrl('ManageSubjects'),
              icon: BookMarked,
            },
            {
              label: 'Substitute Log',
              path: createPageUrl('SubstituteLog'),
              icon: UserCog,
            },
          ],
        },
        {
          title: 'Approvals & Review',
          items: [
            {
              label: 'Review Leave',
              path: createPageUrl('ReviewLeave'),
              icon: CheckCircle,
            },
            {
              label: 'Unapproved Absences',
              path: createPageUrl('UnapprovedAbsences'),
              icon: AlertTriangle,
            },
            {
              label: 'Review Attendance',
              path: createPageUrl('AttendanceApproval'),
              icon: ClipboardList,
            },
          ],
        },
        {
          title: 'Analytics & Exams',
          items: [
            {
              label: 'View Reports',
              path: createPageUrl('Reports'),
              icon: BarChart2,
            },
            {
              label: 'Manage Exams',
              path: createPageUrl('ManageExams'),
              icon: ClipboardList,
            },
            {
              label: 'Class Comparison',
              path: createPageUrl('ClassComparison'),
              icon: Layers,
            },
          ],
        },
      ];
    } else if (role === 'parent') {
      return [
        {
          title: 'Parent Quick Navigation',
          items: [
            {
              label: 'Messages',
              path: createPageUrl('Communication'),
              icon: MessageSquare,
              badge: unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : null,
              badgeColor: 'bg-purple-500 text-white',
            },
            {
              label: 'Apply Leave',
              path: createPageUrl('ApplyLeave'),
              icon: Calendar,
              primary: true,
            },
            {
              label: 'View Marks',
              path: createPageUrl('ViewMarks'),
              icon: Award,
            },
            {
              label: 'Report Card',
              path: createPageUrl('ReportCard'),
              icon: FileText,
            },
          ],
        },
        {
          title: 'Academic & Daily',
          items: [
            {
              label: 'Homework',
              path: createPageUrl('Homework'),
              icon: BookCopy,
            },
            {
              label: 'Timetable',
              path: createPageUrl('Timetable'),
              icon: CalendarDays,
            },
            {
              label: 'Daily Diary',
              path: createPageUrl('Diary'),
              icon: BookOpen,
            },
            {
              label: 'Exam Schedule',
              path: createPageUrl('ExamSchedule'),
              icon: CalendarDays,
            },
            {
              label: 'Announcements',
              path: createPageUrl('Announcements'),
              icon: Megaphone,
            },
            {
              label: 'PTM Schedule',
              path: createPageUrl('PtmSchedule'),
              icon: Users,
            },
          ],
        },
      ];
    }
    return [];
  };

  const dashboardHomePath =
    role === 'principal'
      ? createPageUrl('PrincipalDashboard')
      : role === 'parent'
      ? createPageUrl('ParentDashboard')
      : createPageUrl('TeacherDashboard');

  const isHomeActive = currentPath === dashboardHomePath.toLowerCase();

  const themeColors = {
    teacher: {
      bg: 'bg-emerald-900',
      activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30',
      primaryBtn: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      text: 'text-emerald-100',
      heading: 'text-emerald-300',
      hover: 'hover:bg-emerald-800/60 hover:text-white',
      accent: 'emerald',
    },
    principal: {
      bg: 'bg-slate-900',
      activeBg: 'bg-blue-600 text-white shadow-md shadow-blue-900/30',
      primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20',
      text: 'text-slate-200',
      heading: 'text-blue-400',
      hover: 'hover:bg-slate-800 hover:text-white',
      accent: 'blue',
    },
    parent: {
      bg: 'bg-purple-950',
      activeBg: 'bg-purple-600 text-white shadow-md shadow-purple-950/30',
      primaryBtn: 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-600/20',
      text: 'text-purple-100',
      heading: 'text-purple-300',
      hover: 'hover:bg-purple-900/60 hover:text-white',
      accent: 'purple',
    },
  }[role] || {
    bg: 'bg-slate-900',
    activeBg: 'bg-blue-600 text-white',
    primaryBtn: 'bg-blue-600 text-white',
    text: 'text-slate-200',
    heading: 'text-slate-400',
    hover: 'hover:bg-slate-800',
  };

  const navContent = (
    <div className={`${sidebarHeightClass} flex flex-col ${themeColors.bg} text-white transition-all duration-300 select-none overflow-hidden`}>
      {/* Top Brand / Header */}
      <div className={`p-3.5 border-b border-white/10 flex shrink-0 ${isCollapsed ? 'flex-col items-center gap-2.5' : 'items-center justify-between'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => isCollapsed && setIsCollapsed(false)}
            className={`w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner ${
              isCollapsed ? 'cursor-pointer hover:bg-white/20 transition-all' : ''
            }`}
            title={isCollapsed ? "Click to expand sidebar" : "EduSphere"}
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="font-extrabold text-base leading-tight tracking-tight text-white truncate">
                EduSphere
              </h2>
              <p className="text-[11px] font-medium text-white/60 capitalize truncate">
                {role} Portal
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors ${
            isCollapsed ? 'w-8 h-8 items-center justify-center' : ''
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Dashboard Link */}
      <div className="p-3 shrink-0">
        <button
          onClick={() => {
            navigate(dashboardHomePath);
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
            isHomeActive ? themeColors.activeBg : `${themeColors.text} ${themeColors.hover}`
          }`}
          title="Dashboard Overview"
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Dashboard Overview</span>}
        </button>
      </div>

      {/* Nav Sections List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {getNavSections().map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <p className={`px-3 text-[10px] font-bold uppercase tracking-wider ${themeColors.heading} mb-1.5`}>
                {section.title}
              </p>
            )}
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path.toLowerCase().split('?')[0];

              if (item.primary) {
                return (
                  <button
                    key={itemIdx}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all mb-2 ${
                      isActive
                        ? themeColors.primaryBtn
                        : `${themeColors.text} ${themeColors.hover} border border-white/10`
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={itemIdx}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? themeColors.activeBg
                      : `${themeColors.text} ${themeColors.hover}`
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className={`ml-auto px-1.5 py-0.5 text-[11px] font-bold rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {role === 'parent' && onAddChild && !isCollapsed && (
          <div className="pt-2">
            <button
              onClick={() => {
                onAddChild();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 border border-white/20 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Link Another Child</span>
            </button>
          </div>
        )}
      </div>

      {/* User Info Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20 flex items-center justify-between gap-2 shrink-0">
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {teacherName || studentName || 'EduSphere User'}
            </p>
            <p className="text-[10px] text-white/60 truncate">
              {schoolName || `${role.toUpperCase()} Account`}
            </p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/70 hover:text-red-300 transition-colors ml-auto"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky ${sidebarTopClass} ${sidebarHeightClass} z-30 transition-all duration-300 self-start ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 w-full max-w-xs h-full z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
