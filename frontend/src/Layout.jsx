import React from 'react';

export default function Layout({ children, currentPageName }) {
  // Pages that should render without any layout wrapper
  const fullScreenPages = [
    'Home', 
    'RoleSelection', 
    'SetupSchool', 
    'JoinSchool', 
    'SelectClasses',
    'ParentLogin',
    'PrincipalDashboard',
    'TeacherDashboard',
    'ParentDashboard',
    'ManageClasses',
    'ManageStudents',
    'MarkAttendance',
    'AttendanceApproval',
    'EditAttendance',
    'PrincipalSettings',
    'TeacherSettings',
    'ViewStudents',
    'Notifications',
    'Dashboard',
    'AttendanceHistory',
    'Reports',
    'AttendanceAnalytics'
  ];

  // Return children directly for full-screen pages
  if (fullScreenPages.includes(currentPageName)) {
    return children;
  }

  // Default layout for any other pages
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
