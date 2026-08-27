import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ClipboardCheck, BookOpen } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';

export default function MobileBottomNav({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  if (location.pathname.includes('/login') || location.pathname.includes('/join') || location.pathname.includes('/roleselection')) {
    return null;
  }

  const getNavItems = () => {
    if (role === 'principal') {
      return [
        { name: 'Dashboard', icon: Home, path: createPageUrl('PrincipalDashboard') },
        { name: 'Teachers', icon: BookOpen, path: createPageUrl('ManageTeachers') },
        { name: 'Students', icon: ClipboardCheck, path: createPageUrl('ManageStudents') },
        { name: 'Reports', icon: MessageCircle, path: createPageUrl('ViewReports') },
      ];
    }

    if (role === 'parent') {
      return [
        { name: 'Dashboard', icon: Home, path: createPageUrl('ParentDashboard') },
        { name: 'Messages', icon: MessageCircle, path: createPageUrl('Communication') },
        { name: 'Attendance', icon: ClipboardCheck, path: createPageUrl('ReportCard') },
        { name: 'Leaves', icon: BookOpen, path: createPageUrl('ApplyLeave') },
      ];
    }
    
    const isSubjectTeacher = localStorage.getItem('teacher_role') === 'subject_teacher';
    
    let teacherNav = [
      { name: 'Dashboard', icon: Home, path: createPageUrl('TeacherDashboard') },
      { name: 'Messages', icon: MessageCircle, path: createPageUrl('Communication') },
      { name: 'Attendance', icon: ClipboardCheck, path: createPageUrl('MarkAttendance') },
      { name: 'Homework', icon: BookOpen, path: createPageUrl('Homework') },
    ];
    
    if (isSubjectTeacher) {
      teacherNav = teacherNav.filter(item => item.name !== 'Attendance');
    }
    return teacherNav;
  };

  const items = getNavItems();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 flex items-center justify-around z-[60] shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] pb-safe">
      {items.map((item) => {
        const isActive = location.pathname.toLowerCase() === item.path.toLowerCase() || 
                        (item.name === 'Messages' && location.pathname.includes('/messages'));
        
        let activeColor = 'text-[#00a884]';
        let activeBg = 'bg-[#00a884]/10';
        let activeFill = 'fill-[#00a884]/20';
        
        if (role === 'parent') {
          activeColor = 'text-purple-600';
          activeBg = 'bg-purple-50';
          activeFill = 'fill-purple-100';
        } else if (role === 'principal') {
          activeColor = 'text-blue-600';
          activeBg = 'bg-blue-50';
          activeFill = 'fill-blue-100';
        }
        
        return (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-16 h-[60px] space-y-1 transition-colors ${
              isActive ? activeColor : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${isActive ? activeBg : 'bg-transparent'}`}>
              <item.icon className={`w-5 h-5 ${isActive ? activeFill : ''}`} />
            </div>
            <span className={`text-[10px] font-medium leading-none ${isActive ? 'font-bold' : ''}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
