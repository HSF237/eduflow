import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getClasses, getStudentsByClass, getMessages } from '@/lib/db';
import { createPageUrl } from '@/utils';

export default function FloatingMessageButton() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const parentStudentId = localStorage.getItem('parent_student_id');
  const isParentRoute = window.location.pathname.includes('/parent/');
  const isTeacherRoute = window.location.pathname.includes('/teacher/') || window.location.pathname.includes('/principal/');
  const isFirstLoad = React.useRef(true);

  useEffect(() => {
    // Only run if we are logged in and on a valid route
    if (!authUser && !parentStudentId) return;
    
    const fetchUnread = async () => {
      try {
        let count = 0;
        
        if (isParentRoute && parentStudentId) {
          // Parent logic
          const msgs = await getMessages(parentStudentId);
          const lastRead = Number(localStorage.getItem(`parent_read_${parentStudentId}`) || 0);
          count = msgs.filter(m => m.sender_type === 'teacher' && new Date(m.created_at || 0).getTime() > lastRead).length;
        } 
        else if (isTeacherRoute && authUser) {
          // Teacher logic
          const teacher = await getTeacherByUserId(authUser.uid);
          if (teacher) {
            let allClasses = await getClasses(teacher.school_id).catch(() => []);
            if (!allClasses || allClasses.length === 0) allClasses = await getClasses().catch(() => []);
            
            let myClasses = allClasses.filter(c => c.teacher_id === teacher.id);
            if (myClasses.length === 0 && teacher.assigned_classes) {
              myClasses = allClasses.filter(c => teacher.assigned_classes.includes(c.id));
            }
            
            const activeClasses = myClasses.length > 0 ? myClasses : allClasses;
            if (activeClasses.length > 0) {
              const studsPromises = activeClasses.map(c => getStudentsByClass(c.id));
              const studsArrays = await Promise.all(studsPromises);
              const uniqueStuds = [];
              const seen = new Set();
              for (const s of studsArrays.flat()) {
                if (!seen.has(s.id)) {
                  seen.add(s.id);
                  uniqueStuds.push(s);
                }
              }
              
              const messagesPromises = uniqueStuds.map(async (s) => {
                const msgs = await getMessages(s.id);
                const lastRead = Number(localStorage.getItem(`teacher_read_${s.id}`) || 0);
                return msgs.filter(m => m.sender_type === 'parent' && new Date(m.created_at || 0).getTime() > lastRead).length;
              });
              
              const counts = await Promise.all(messagesPromises);
              count = counts.reduce((sum, c) => sum + c, 0);
              
              // Also check staff room
              const staffMsgs = await getMessages('staff_group');
              const staffRead = Number(localStorage.getItem(`teacher_read_staff_group`) || 0);
              const staffUnread = staffMsgs.filter(m => m.sender_name !== (teacher.name || 'Teacher') && new Date(m.created_at || 0).getTime() > staffRead).length;
              count += staffUnread;
            }
          }
        }
        
        setUnreadCount(prev => {
          if (!isFirstLoad.current && count > prev && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('EduSphere', {
              body: 'You have a new message!',
              icon: '/vite.svg'
            });
          }
          isFirstLoad.current = false;
          return count;
        });
        
      } catch (err) {
        // fail silently to not block UI
      }
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [authUser, parentStudentId, isParentRoute, isTeacherRoute]);

  // Don't show button if we're ALREADY on the messages page
  if (window.location.pathname.endsWith('/messages')) return null;

  return (
    <button
      onClick={() => navigate(createPageUrl('Communication'))}
      className="fixed bottom-6 right-6 w-14 h-14 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 focus:outline-none focus:ring-4 focus:ring-[#00a884]/50 group"
      aria-label="Open Messages"
    >
      <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
