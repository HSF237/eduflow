const prisma = require('../lib/prisma');

const markBulkAttendance = async (req, res) => {
  try {
    const { records } = req.body; // array of { studentId, classId, schoolId, date, status, reason }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const upsertPromises = records.map((rec) =>
      prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: rec.studentId,
            date: rec.date
          }
        },
        update: {
          status: rec.status,
          reason: rec.reason || null,
          updatedBy: req.user?.userId || null
        },
        create: {
          schoolId: rec.schoolId,
          classId: rec.classId,
          studentId: rec.studentId,
          date: rec.date,
          status: rec.status,
          reason: rec.reason || null,
          updatedBy: req.user?.userId || null
        }
      })
    );

    const results = await prisma.$transaction(upsertPromises);
    res.json({ message: 'Attendance marked successfully', count: results.length });
  } catch (err) {
    console.error('Mark Attendance Error:', err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

const getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'classId and date are required query parameters' });
    }

    const records = await prisma.attendance.findMany({
      where: { classId, date },
      include: { student: true }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student attendance' });
  }
};

module.exports = {
  markBulkAttendance,
  getAttendanceByClassAndDate,
  getStudentAttendance
};
