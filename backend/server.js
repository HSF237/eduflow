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
const storageRouter = require('./routers/storageRouter');

app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/students', studentRouter);
app.use('/api/storage', storageRouter);

// Health Check Route
app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'EduFlow Self-Hosted REST API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EduFlow Self-Hosted Backend running on port ${PORT}`);
});
