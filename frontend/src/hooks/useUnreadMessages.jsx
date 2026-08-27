import { useQuery } from '@tanstack/react-query';
import { getTeacherByUserId, getClasses, getStudentsByClass, getMessages, getStudentByParentCode } from '@/lib/db';
import { useAuth } from './AuthContext';

export function useUnreadMessages(role) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unreadMessages', role, user?.uid || user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      let totalUnread = 0;
      const parseTimestamp = (ts) => new Date(ts).getTime();

      try {
        if (role === 'teacher') {
          // Fetch teacher classes
          const teacher = await getTeacherByUserId(user.uid || user.id);
          if (!teacher) return 0;
          const classes = await getClasses(teacher.school_id);
          const teacherClasses = classes.filter(c => c.class_teacher_id === teacher.id);
          
          let students = [];
          for (const cls of teacherClasses) {
            const studs = await getStudentsByClass(cls.id);
            students = [...students, ...studs];
          }

          // Fetch messages and check unread count
          for (const student of students) {
            const msgs = await getMessages(student.id);
            // We consider it unread if it was sent by a parent, and its timestamp is > lastRead
            const sorted = msgs.sort((a,b) => parseTimestamp(a.created_at) - parseTimestamp(b.created_at));
            
            // Read timestamp is stored in localStorage by Communication.jsx
            const lastRead = parseInt(localStorage.getItem('teacher_read_' + student.id) || '0', 10);
            
            const unread = sorted.filter(m => m.sender_type === 'parent' && parseTimestamp(m.created_at) > lastRead).length;
            totalUnread += unread;
          }
        } else if (role === 'parent') {
          // Parent logic
          const storedParentCode = localStorage.getItem('parent_code_verified');
          if (!storedParentCode) return 0;
          
          const student = await getStudentByParentCode(storedParentCode);
          if (!student) return 0;

          const msgs = await getMessages(student.id);
          const sorted = msgs.sort((a,b) => parseTimestamp(a.created_at) - parseTimestamp(b.created_at));
          
          const lastRead = parseInt(localStorage.getItem('parent_read_' + student.id) || '0', 10);
          
          const unread = sorted.filter(m => m.sender_type === 'teacher' && parseTimestamp(m.created_at) > lastRead).length;
          totalUnread += unread;
        }
      } catch (err) {
        console.error('Error fetching unread messages:', err);
      }

      return totalUnread;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
    enabled: !!user && (role === 'teacher' || role === 'parent'),
  });
}
