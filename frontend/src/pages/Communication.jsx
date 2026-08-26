import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { getTeacherByUserId, getClasses, getStudentsByClass, getMessages, sendMessage } from '@/lib/db';
import { ArrowLeft, Send, Loader2, Search, Check, CheckCheck, User, MessageCircle } from 'lucide-react';

function CommunicationContent() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [students, setStudents] = useState([]);
  
  // All messages for all students in the class
  const [allMessages, setAllMessages] = useState({});
  const [readTimestamps, setReadTimestamps] = useState({});
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const parentClassId = localStorage.getItem('parent_class_id');
  const parentSchoolId = localStorage.getItem('parent_school_id');
  const parentStudentId = localStorage.getItem('parent_student_id');
  const parentStudentName = localStorage.getItem('parent_student_name') || 'Parent';
  
  const isParentRoute = window.location.pathname.includes('/parent/');
  const isParent = isParentRoute && !!parentStudentId;
  const fixedStudent = isParent;

  useEffect(() => { if (!isLoadingAuth) init(); }, [isLoadingAuth, authUser]);

  useEffect(() => {
    // Poll all messages every 5 seconds
    pollRef.current = setInterval(() => {
      if (students.length > 0) fetchAllMessages(students);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [students]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedStudent]);

  const init = async () => {
    try {
      if (isParentRoute && parentStudentId) {
        setRole('parent');
        setSelectedStudent(parentStudentId);
        
        // Parent only needs to see their own messages
        const s = [{ id: parentStudentId, name: parentStudentName, roll_number: '-' }];
        setStudents(s);
        await fetchAllMessages(s);
        loadReadTimestamps(s, 'parent');
        
        setLoading(false);
        return;
      }

      if (authUser) {
        const teacher = await getTeacherByUserId(authUser.uid);
        if (teacher) {
          setRole('teacher');
          setTeacherData(teacher);
          let allClasses = await getClasses(teacher.school_id).catch(() => []);
          if (!allClasses || allClasses.length === 0) {
            allClasses = await getClasses().catch(() => []);
          }
          
          let myClasses = allClasses.filter(c => c.teacher_id === teacher.id);
          if (myClasses.length === 0 && teacher.assigned_classes && teacher.assigned_classes.length > 0) {
            myClasses = allClasses.filter(c => teacher.assigned_classes.includes(c.id));
          }
          
          const activeClasses = myClasses.length > 0 ? myClasses : allClasses;
          
          if (activeClasses.length > 0) {
            const studsPromises = activeClasses.map(c => getStudentsByClass(c.id));
            const studsArrays = await Promise.all(studsPromises);
            
            // Remove duplicates just in case
            const uniqueStuds = [];
            const seen = new Set();
            for (const s of studsArrays.flat()) {
              if (!seen.has(s.id)) {
                seen.add(s.id);
                uniqueStuds.push(s);
              }
            }
            
            // Inject Teachers Lounge group chat
            uniqueStuds.unshift({
              id: 'staff_group',
              name: 'Teachers Lounge',
              isGroup: true,
              roll_number: 'Group Chat'
            });
            
            setStudents(uniqueStuds);
            await fetchAllMessages(uniqueStuds);
            loadReadTimestamps(uniqueStuds, 'teacher');
          }
          setLoading(false);
          return;
        }
      }

      // Fallback
      setRole('parent');
      setSelectedStudent('student_demo');
      setLoading(false);
    } catch (err) {
      console.error('Communication init error:', err);
      setLoading(false);
    }
  };

  const fetchAllMessages = async (studs) => {
    try {
      const messagesMap = {};
      const promises = studs.map(async (s) => {
        const msgs = await getMessages(s.id);
        messagesMap[s.id] = msgs;
      });
      await Promise.all(promises);
      setAllMessages(messagesMap);
    } catch (err) {
      console.error('Error fetching all messages:', err);
    }
  };

  const [opposingReadTimestamps, setOpposingReadTimestamps] = useState({});

  const loadReadTimestamps = (studs, r = role) => {
    const timestamps = {};
    const opposing = {};
    studs.forEach(s => {
      const ts = localStorage.getItem(`${r}_read_${s.id}`);
      const oppTs = localStorage.getItem(`${r === 'teacher' ? 'parent' : 'teacher'}_read_${s.id}`);
      timestamps[s.id] = ts ? Number(ts) : 0;
      opposing[s.id] = oppTs ? Number(oppTs) : 0;
    });
    setReadTimestamps(timestamps);
    setOpposingReadTimestamps(opposing);
  };

  const markThreadAsRead = (studentId, r = role) => {
    const now = Date.now();
    localStorage.setItem(`${r}_read_${studentId}`, now.toString());
    setReadTimestamps(prev => ({ ...prev, [studentId]: now }));
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudent(studentId);
    markThreadAsRead(studentId);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudent || !messageText.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        school_id: getSchoolId() || 'super_admin_school',
        class_id: getClassId() || 'class_demo',
        student_id: selectedStudent,
        sender_type: role || 'parent',
        sender_name: getSenderName(),
        message: messageText.trim(),
        message_type: 'text',
      });
      setMessageText('');
      
      // Instantly reload
      await fetchAllMessages(students);
      markThreadAsRead(selectedStudent);
    } catch (err) { console.error('Error sending message:', err); }
    setSending(false);
  };

  const formatTimeShort = (d) => {
    if (!d) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const parseTimestamp = (ts, fallbackToZero = false) => {
    if (!ts) return fallbackToZero ? new Date(0) : new Date();
    try {
      if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
      if (typeof ts === 'object' && ts.seconds) return new Date(ts.seconds * 1000);
      return new Date(ts);
    } catch (e) { return fallbackToZero ? new Date(0) : new Date(); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#eae6df]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00a884]" />
    </div>
  );

  const filteredStudents = students.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const getClassId = () => role === 'teacher'
    ? students.find(s => s.id === selectedStudent)?.class_id
    : parentClassId;
  const getSchoolId = () => role === 'teacher' ? teacherData?.school_id : parentSchoolId;
  const getSenderName = () => role === 'teacher' ? (teacherData?.name || 'Teacher') : parentStudentName;

  // Calculate latest messages and unread counts for sorting
  const chatList = filteredStudents.map(s => {
    const msgs = allMessages[s.id] || [];
    // Sort just to find the true latest
    const sortedMsgs = [...msgs].sort((a, b) => parseTimestamp(a.created_at, true).getTime() - parseTimestamp(b.created_at, true).getTime());
    const latest = sortedMsgs.length > 0 ? sortedMsgs[sortedMsgs.length - 1] : null;
    const lastRead = readTimestamps[s.id] || 0;
    
    let unreadCount = 0;
    if (role === 'teacher') {
      if (s.isGroup) {
        unreadCount = sortedMsgs.filter(m => m.sender_name !== getSenderName() && parseTimestamp(m.created_at, true).getTime() > lastRead).length;
      } else {
        unreadCount = sortedMsgs.filter(m => m.sender_type === 'parent' && parseTimestamp(m.created_at, true).getTime() > lastRead).length;
      }
    } else {
      unreadCount = sortedMsgs.filter(m => m.sender_type === 'teacher' && parseTimestamp(m.created_at, true).getTime() > lastRead).length;
    }

    return {
      student: s,
      latestMsg: latest,
      latestTime: latest ? parseTimestamp(latest.created_at, true) : new Date(0),
      unreadCount
    };
  }).sort((a, b) => b.latestTime.getTime() - a.latestTime.getTime()); // Sort by newest message

  const activeStudentInfo = students.find(s => s.id === selectedStudent);
  const rawActiveMessages = selectedStudent ? (allMessages[selectedStudent] || []) : [];
  const activeMessages = [...rawActiveMessages].sort((a, b) => parseTimestamp(a.created_at, true).getTime() - parseTimestamp(b.created_at, true).getTime());

  const themeColors = {
    header: role === 'parent' ? 'bg-purple-700' : 'bg-[#00a884]',
    bubbleMe: role === 'parent' ? 'bg-purple-100' : 'bg-[#d9fdd3]',
    sendBtn: role === 'parent' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-[#00a884] hover:bg-[#008f6f]',
    ring: role === 'parent' ? 'focus-within:ring-purple-700' : 'focus-within:ring-[#00a884]',
    badge: role === 'parent' ? 'bg-purple-700' : 'bg-[#00a884]',
    badgeText: role === 'parent' ? 'text-purple-700' : 'text-[#00a884]',
  };

  return (
    <div className="h-screen flex flex-col bg-[#eae6df] font-sans">
      
      {/* Header — hidden on mobile when in a chat, but visible on desktop */}
      <header className={`${themeColors.header} text-white flex-none z-10 shadow-sm ${selectedStudent && !fixedStudent ? 'hidden md:block' : 'block'}`}>
        <div className="h-[60px] px-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-semibold text-lg">Messages</div>
        </div>
      </header>

      {/* Main WhatsApp-like Layout */}
      <main className="flex-1 overflow-hidden flex w-full max-w-[1600px] mx-auto md:py-4 md:px-4 lg:px-8">
        
        <div className="w-full h-full bg-white md:rounded-xl shadow-lg flex overflow-hidden border border-slate-200">
          
          {/* LEFT PANE: Contacts List */}
          <div className={`w-full md:w-[350px] lg:w-[400px] flex-none flex flex-col border-r border-slate-200 bg-white ${selectedStudent && !fixedStudent ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search / Header for Contacts */}
            <div className="p-3 bg-[#f0f2f5] flex-none">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={role === 'teacher' ? "Search students..." : "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-white border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ${role === 'parent' ? 'focus:ring-purple-700' : 'focus:ring-[#00a884]'} shadow-sm`}
                />
              </div>
            </div>

            {/* Contacts Scrollable List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
              {chatList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No conversations found.</div>
              ) : (
                chatList.map((chat) => {
                  const { student, latestMsg, unreadCount } = chat;
                  const isSelected = selectedStudent === student.id;
                  
                  return (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student.id)}
                      className={`w-full flex items-center gap-3 p-3 transition-colors border-b border-[#f0f2f5] ${
                        isSelected ? 'bg-[#f0f2f5]' : 'bg-white hover:bg-[#f5f6f6]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                      
                      {/* Contact Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-medium text-slate-900 truncate text-[15px]">
                            {role === 'parent' ? 'Class Teacher' : student.name}
                          </h3>
                          {latestMsg && (
                            <span className={`text-xs shrink-0 ml-2 ${unreadCount > 0 ? (role === 'parent' ? 'text-purple-700 font-medium' : 'text-[#00a884] font-medium') : 'text-slate-500'}`}>
                              {formatTimeShort(parseTimestamp(latestMsg.created_at))}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center gap-2">
                          <p className="text-sm text-slate-500 truncate">
                            {latestMsg ? (
                              <span className="flex items-center gap-1">
                                {latestMsg.sender_type === role && <CheckCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                                <span className="truncate">{latestMsg.message}</span>
                              </span>
                            ) : (
                              <span className="italic text-slate-400">No messages yet</span>
                            )}
                          </p>
                          {unreadCount > 0 && (
                            <div className={`w-5 h-5 rounded-full ${themeColors.badge} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Chat Area */}
          <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${!selectedStudent && !fixedStudent ? 'hidden md:flex' : 'flex'}`}
               style={{ backgroundImage: 'url("/bg-chat-tile.jpg")', opacity: 0.95 }}>
            
            {selectedStudent ? (
              <>
                {/* Chat Header */}
                <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center gap-3 border-b border-slate-200 z-10">
                  {/* Mobile Back Button inside Chat */}
                  {!fixedStudent && (
                    <button onClick={() => setSelectedStudent(null)} className="md:hidden p-1.5 -ml-2 rounded-full hover:bg-slate-200 text-slate-600">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  
                  <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900 truncate">
                      {role === 'parent' ? 'Class Teacher' : activeStudentInfo?.name}
                    </h2>
                    {role === 'teacher' && activeStudentInfo && (
                      <p className="text-xs text-slate-500 truncate">Roll {activeStudentInfo.roll_number}</p>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 z-10 scrollbar-thin scrollbar-thumb-slate-300/50">
                  {activeMessages.length === 0 ? (
                    <div className="bg-[#ffeecd] text-slate-700 text-sm py-2 px-4 rounded-lg text-center max-w-sm mx-auto shadow-sm mt-4">
                      Messages are end-to-end simulated. Say hello to start the conversation!
                    </div>
                  ) : (
                    activeMessages.map((msg, i) => {
                      const isMe = activeStudentInfo?.isGroup 
                        ? msg.sender_name === getSenderName()
                        : msg.sender_type === role;
                      
                      // Check if we need to show the date bubble (if day changed)
                      const currDate = parseTimestamp(msg.created_at).toDateString();
                      const prevDate = i > 0 ? parseTimestamp(activeMessages[i-1].created_at).toDateString() : null;
                      const showDate = currDate !== prevDate;
                      
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="bg-white/90 text-slate-600 text-xs font-medium py-1 px-3 rounded-lg shadow-sm">
                                {parseTimestamp(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-sm relative ${
                              isMe ? themeColors.bubbleMe : 'bg-white'
                            }`}>
                              
                              {/* Sender Labels */}
                              {!isMe && !activeStudentInfo?.isGroup && role === 'teacher' && (
                                <p className="text-[11px] font-bold text-orange-600 mb-0.5">Parent / Guardian</p>
                              )}
                              {!isMe && !activeStudentInfo?.isGroup && role === 'parent' && (
                                <p className="text-[11px] font-bold text-blue-600 mb-0.5">{msg.sender_name || 'Class Teacher'}</p>
                              )}
                              {!isMe && activeStudentInfo?.isGroup && (
                                <p className="text-[11px] font-bold text-blue-600 mb-0.5">{msg.sender_name || 'Teacher'}</p>
                              )}
                              
                              <div className="text-[14.5px] text-slate-900 leading-snug break-words">
                                {msg.message}
                                {/* Invisible spacer to prevent text overlapping timestamp */}
                                <span className="inline-block w-12 h-2"></span>
                              </div>
                              
                              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">
                                  {parseTimestamp(msg.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                                {isMe && (
                                  (() => {
                                    const msgTime = parseTimestamp(msg.created_at, true).getTime();
                                    const oppReadTime = opposingReadTimestamps[selectedStudent] || 0;
                                    const isRead = msgTime <= oppReadTime;
                                    const isJustSent = (Date.now() - msgTime) < 2000;
                                    if (isRead || activeStudentInfo?.isGroup) return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
                                    if (isJustSent) return <Check className="w-3.5 h-3.5 text-slate-400" />;
                                    return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
                                  })()
                                )}
                              </div>
                              
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>

                {/* Message Input Box */}
                <div className="bg-[#f0f2f5] p-3 md:px-4 md:py-3 z-10">
                  <form onSubmit={handleSend} className={`flex items-end gap-2 bg-white rounded-xl pl-4 pr-2 py-2 border border-slate-200 shadow-sm focus-within:ring-2 ${themeColors.ring}`}>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Type a message"
                      rows={1}
                      className="flex-1 max-h-32 bg-transparent border-none focus:outline-none resize-none py-1.5 text-[15px] leading-relaxed text-slate-800"
                      style={{ minHeight: '24px' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${themeColors.sendBtn} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5`}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Empty State (Desktop) */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <MessageCircle className="w-12 h-12 text-slate-300" />
                </div>
                <h2 className="text-2xl font-light text-slate-600 mb-3">EduSphere Web</h2>
                <p className="text-sm text-slate-500 max-w-sm">
                  Select a student from the left panel to view messages or start a new conversation.
                </p>
                <div className="mt-8 pt-8 border-t border-slate-200/50 flex items-center gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5" /> End-to-end simulated encryption
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}


export default function Communication() {
  return (
    <AppLayout title="Messages">
      <CommunicationContent />
    </AppLayout>
  );
}
