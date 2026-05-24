const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routers
const userRouter = require('./routers/userRouter');
const schoolRouter = require('./routers/schoolRouter');
const studentRouter = require('./routers/studentRouter');

app.use('/api/users', userRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/students', studentRouter);

// Basic Route
app.get('/', (req, res) => {
  res.send('EduSphere API is running');
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edusphere')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
