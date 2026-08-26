/**
 * Utility functions for EduSphere ERP
 */
import { pagesConfig } from './pages.config';

/**
 * Generates a URL for a given page name based on the configuration.
 * @param {string} pageName - The name of the page as defined in pagesConfig.
 * @param {Object} params - Optional URL parameters.
 * @returns {string} The generated URL.
 */
export const PAGE_ROUTES = {
  PrincipalDashboard: '/principal/dashboard',
  ManageClasses: '/principal/manage-classes',
  ManageTeachers: '/principal/manage-teachers',
  ManageSubjects: '/principal/manage-subjects',
  SubstituteLog: '/principal/substitute-log',
  Reports: '/principal/reports',
  ClassComparison: '/principal/class-comparison',
  PrincipalSettings: '/principal/settings',
  
  TeacherDashboard: '/teacher/dashboard',
  MarkAttendance: '/teacher/mark-attendance',
  ReviewLeave: '/teacher/review-leave',
  ViewStudents: '/teacher/view-students',
  AttendanceHistory: '/teacher/attendance-history',
  AttendanceAnalytics: '/teacher/attendance-analytics',
  EnterMarks: '/teacher/enter-marks',
  ExamSchedule: '/teacher/exam-schedule',
  Homework: '/teacher/homework',
  Timetable: '/teacher/timetable',
  Announcements: '/teacher/announcements',
  Diary: '/teacher/diary',
  PtmSchedule: '/teacher/ptm-schedule',
  TeacherManageExams: '/teacher/manage-exams',
  TeacherSettings: '/teacher/settings',
  EditAttendance: '/teacher/edit-attendance',
  
  ParentDashboard: '/parent/dashboard',
  ParentLogin: '/parent/login',
  ApplyLeave: '/parent/apply-leave',
  ViewMarks: '/parent/view-marks',
  
  ManageStudents: { principal: '/principal/manage-students', teacher: '/teacher/add-students' },
  ManageExams: { principal: '/principal/manage-exams', teacher: '/teacher/manage-exams' },
  Communication: { teacher: '/teacher/messages', parent: '/parent/messages' },
  StudentProgress: { teacher: '/teacher/student-progress', parent: '/parent/student-progress' },
  ReportCard: { teacher: '/teacher/report-card', parent: '/parent/report-card' },
  UnapprovedAbsences: { principal: '/principal/unapproved-absences', teacher: '/teacher/unapproved-absences' },
  AttendanceApproval: { principal: '/principal/attendance-approval', teacher: '/teacher/attendance-approval' },

  Home: '/',
  RoleSelection: '/roleselection',
  JoinSchool: '/join-school',
  JoinTeacher: '/join-teacher',
  Login: '/login',
  Register: '/register',
  SetupSchool: '/setup-school',
};

export const createPageUrl = (pageName, params = {}) => {
  const { Pages } = pagesConfig;
  
  if (!Pages[pageName]) {
    console.warn(`Page "${pageName}" not found in pagesConfig.`);
    return '#';
  }

  let url = `/${pageName.toLowerCase()}`;
  
  const mapped = PAGE_ROUTES[pageName];
  if (mapped) {
    if (typeof mapped === 'string') {
      url = mapped;
    } else {
      const path = window.location.pathname;
      if (path.startsWith('/principal') && mapped.principal) url = mapped.principal;
      else if (path.startsWith('/teacher') && mapped.teacher) url = mapped.teacher;
      else if (path.startsWith('/parent') && mapped.parent) url = mapped.parent;
      else url = Object.values(mapped)[0];
    }
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) queryParams.append(key, value);
  });

  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

/**
 * Formats a date string to a human-readable format.
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Validates an email address.
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
