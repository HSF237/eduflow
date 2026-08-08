const prisma = require('../lib/prisma');

const createExam = async (req, res) => {
  try {
    const { schoolId, classId, subjectId, name, term, date, maxMarks, passingMarks } = req.body;
    const exam = await prisma.exam.create({
      data: {
        schoolId,
        classId,
        subjectId,
        name,
        term,
        date,
        maxMarks: parseFloat(maxMarks),
        passingMarks: passingMarks ? parseFloat(passingMarks) : null
      }
    });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

const getExamsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const exams = await prisma.exam.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

const submitBulkMarks = async (req, res) => {
  try {
    const { marks } = req.body; // array of { examId, studentId, marksObtained, grade, remarks }
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'Marks array is required' });
    }

    const upserts = marks.map((m) =>
      prisma.mark.upsert({
        where: {
          examId_studentId: {
            examId: m.examId,
            studentId: m.studentId
          }
        },
        update: {
          marksObtained: parseFloat(m.marksObtained),
          grade: m.grade || null,
          remarks: m.remarks || null,
          updatedBy: req.user?.userId || null
        },
        create: {
          examId: m.examId,
          studentId: m.studentId,
          marksObtained: parseFloat(m.marksObtained),
          grade: m.grade || null,
          remarks: m.remarks || null,
          updatedBy: req.user?.userId || null
        }
      })
    );

    const results = await prisma.$transaction(upserts);
    res.json({ message: 'Marks submitted successfully', count: results.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit marks' });
  }
};

const getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const marks = await prisma.mark.findMany({
      where: { studentId },
      include: {
        exam: {
          include: { subject: true }
        }
      }
    });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student marks' });
  }
};

module.exports = {
  createExam,
  getExamsByClass,
  submitBulkMarks,
  getStudentMarks
};
