const prisma = require('../lib/prisma');

const createHomework = async (req, res) => {
  try {
    const { schoolId, classId, subjectId, teacherId, title, description, dueDate, attachments = [] } = req.body;
    const homework = await prisma.homework.create({
      data: {
        schoolId,
        classId,
        subjectId,
        teacherId,
        title,
        description,
        dueDate,
        attachments
      }
    });
    res.status(201).json(homework);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post homework' });
  }
};

const getHomeworkByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const homeworkList = await prisma.homework.findMany({
      where: { classId },
      include: { subject: true, teacher: true },
      orderBy: { dueDate: 'asc' }
    });
    res.json(homeworkList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
};

module.exports = {
  createHomework,
  getHomeworkByClass
};
