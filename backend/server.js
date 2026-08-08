const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routers
const authRouter = require('./routers/authRouter');
const schoolRouter = require('./routers/schoolRouter');
const studentRouter = require('./routers/studentRouter');
const classRouter = require('./routers/classRouter');
const attendanceRouter = require('./routers/attendanceRouter');
const examRouter = require('./routers/examRouter');
const homeworkRouter = require('./routers/homeworkRouter');
const announcementRouter = require('./routers/announcementRouter');
const leaveRouter = require('./routers/leaveRouter');
const messageRouter = require('./routers/messageRouter');
const storageRouter = require('./routers/storageRouter');

app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/students', studentRouter);
app.use('/api/classes', classRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/exams', examRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/messages', messageRouter);
app.use('/api/storage', storageRouter);

// Health Check Route
app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'EduFlow Self-Hosted REST API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EduFlow Self-Hosted Backend running on port ${PORT}`);
});
