import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getClasses, getStudentsByClass, getMessages, sendMessage } from '@/lib/db';
import { ArrowLeft, MessageCircle, Send, Loader2 } from 'lucide-react';

export default function Communication() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const parentClassId = localStorage.getItem('parent_class_id');
  const parentSchoolId = localStorage.getItem('parent_school_id');
  const parentStudentId = localStorage.getItem('parent_student_id');
  const parentStudentName = localStorage.getItem('parent_student_name') || 'Parent';
  // Parent localStorage always wins — even if Firebase auth is also present
  const isParent = !!parentStudentId;
  const fixedStudent = isParent;

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth, authUser]);

  useEffect(() => {
    if (!selectedStudent) return;
    loadAndMarkRead(selectedStudent);
    pollRef.current = setInterval(() => loadMessages(selectedStudent), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedStudent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const init = async () => {
    try {
      // Check parent localStorage FIRST — takes priority over Firebase auth
      if (parentStudentId) {
        setRole('parent');
        setSelectedStudent(parentStudentId);
        setLoading(false);
        return;
      }

      // Firebase auth → teacher
      if (authUser) {
        const teacher = await getTeacherByUserId(authUser.uid);
        if (teacher) {
          setRole('teacher');
          setTeacherData(teacher);
          const allClasses = await getClasses(teacher.school_id);
          const myClasses = allClasses.filter(c => c.teacher_id === teacher.id);
          if (myClasses.length > 0) {
            const studs = await getStudentsByClass(myClasses[0].id);
            setStudents(studs);
            if (studs.length > 0) setSelectedStudent(studs[0].id);
          }
          setLoading(false);
          return;
        }
      }

      navigate(createPageUrl('ParentLogin'));
    } catch (err) {
      console.error('Communication init error:', err);
      setLoading(false);
    }
  };

  const loadAndMarkRead = async (studentId) => {
    await loadMessages(studentId);
    localStorage.setItem(`msg_read_${studentId}`, Date.now().toString());
  };

  const loadMessages = async (studentId) => {
    try { setMessages(await getMessages(studentId)); }
    catch (err) { console.error('Error loading messages:', err); }
  };

  const getClassId = () => role === 'teacher'
    ? students.find(s => s.id === selectedStudent)?.class_id
    : parentClassId;
  const getSchoolId = () => role === 'teacher' ? teacherData?.school_id : parentSchoolId;
  const getSenderName = () => role === 'teacher' ? (teacherData?.name || 'Teacher') : parentStudentName;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !selectedStudent) return;
    setSending(true);
    try {
      await sendMessage({
        school_id: getSchoolId(),
        class_id: getClassId(),
        student_id: selectedStudent,
        sender_type: role,
        sender_name: getSenderName(),
        message: messageText.trim(),
        message_type: 'text',
      });
      setMessageText('');
      await loadMessages(selectedStudent);
    } catch (err) { console.error('Error sending message:', err); }
    setSending(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const ms = ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : Number(ts));
    return new Date(ms).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <h1 className="text-base font-bold text-slate-800">Messages</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">

          {!fixedStudent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — Roll {s.roll_number}</option>
                ))}
              </select>
            </div>
          )}

          {/* Message thread */}
          <div className="min-h-[260px] max-h-[420px] overflow-y-auto bg-slate-50 rounded-xl p-3 space-y-3 border border-slate-100">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[220px] text-slate-400 text-sm">
                No messages yet. Start a conversation!
              </div>
            ) : messages.map(msg => {
              const isMe = msg.sender_type === role;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                    isMe ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    <p className={`text-xs mb-1.5 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                      {msg.sender_name || msg.sender_type} · {formatTime(msg.created_at)}
                    </p>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message… (Enter to send)"
              rows={3}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
