import Announcements from './pages/Announcements';
import ClassComparison from './pages/ClassComparison';
import Diary from './pages/Diary';
import ExamSchedule from './pages/ExamSchedule';
import ReportCard from './pages/ReportCard';
import StudentProgress from './pages/StudentProgress';
import ApplyLeave from './pages/ApplyLeave';
import AttendanceAnalytics from './pages/AttendanceAnalytics';
import AttendanceApproval from './pages/AttendanceApproval';
import AttendanceHistory from './pages/AttendanceHistory';
import Communication from './pages/Communication';
import Dashboard from './pages/Dashboard';
import EditAttendance from './pages/EditAttendance';
import EnterMarks from './pages/EnterMarks';
import Home from './pages/Home';
import Homework from './pages/Homework';
import Login from './pages/Login';
import JoinSchool from './pages/JoinSchool';
import ManageClasses from './pages/ManageClasses';
import ManageExams from './pages/ManageExams';
import ManageStudents from './pages/ManageStudents';
import MarkAttendance from './pages/MarkAttendance';
import Notifications from './pages/Notifications';
import ParentDashboard from './pages/ParentDashboard';
import ParentLogin from './pages/ParentLogin';
import PrincipalDashboard from './pages/PrincipalDashboard';
import PrincipalSettings from './pages/PrincipalSettings';
import PtmSchedule from './pages/PtmSchedule';
import Reports from './pages/Reports';
import ReviewLeave from './pages/ReviewLeave';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import SelectClasses from './pages/SelectClasses';
import SetupSchool from './pages/SetupSchool';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherManageExams from './pages/TeacherManageExams';
import Timetable from './pages/Timetable';
import TeacherSettings from './pages/TeacherSettings';
import UnapprovedAbsences from './pages/UnapprovedAbsences';
import ViewMarks from './pages/ViewMarks';
import ViewStudents from './pages/ViewStudents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Announcements": Announcements,
    "ApplyLeave": ApplyLeave,
    "ClassComparison": ClassComparison,
    "AttendanceAnalytics": AttendanceAnalytics,
    "AttendanceApproval": AttendanceApproval,
    "AttendanceHistory": AttendanceHistory,
    "Communication": Communication,
    "Dashboard": Dashboard,
    "Diary": Diary,
    "EditAttendance": EditAttendance,
    "EnterMarks": EnterMarks,
    "ExamSchedule": ExamSchedule,
    "Home": Home,
    "Homework": Homework,
    "Login": Login,
    "JoinSchool": JoinSchool,
    "ManageClasses": ManageClasses,
    "ManageExams": ManageExams,
    "ManageStudents": ManageStudents,
    "MarkAttendance": MarkAttendance,
    "Notifications": Notifications,
    "ParentDashboard": ParentDashboard,
    "ParentLogin": ParentLogin,
    "PrincipalDashboard": PrincipalDashboard,
    "PrincipalSettings": PrincipalSettings,
    "PtmSchedule": PtmSchedule,
    "Reports": Reports,
    "Register": Register,
    "ReportCard": ReportCard,
    "StudentProgress": StudentProgress,
    "ReviewLeave": ReviewLeave,
    "RoleSelection": RoleSelection,
    "SelectClasses": SelectClasses,
    "SetupSchool": SetupSchool,
    "TeacherDashboard": TeacherDashboard,
    "TeacherManageExams": TeacherManageExams,
    "TeacherSettings": TeacherSettings,
    "Timetable": Timetable,
    "UnapprovedAbsences": UnapprovedAbsences,
    "ViewMarks": ViewMarks,
    "ViewStudents": ViewStudents,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
