const prisma = require('../lib/prisma');

const getStudents = async (req, res) => {
  try {
    const { schoolId, classId } = req.query;
    const where = {};
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;

    const students = await prisma.student.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

const getStudentByParentCode = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const student = await prisma.student.findUnique({
      where: { parentCode: code },
      include: { class: true, school: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found for provided parent code' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student by parent code' });
  }
};

const createStudent = async (req, res) => {
  try {
    const student = await prisma.student.create({ data: req.body });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create student' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update student' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

module.exports = {
  getStudents,
  getStudentByParentCode,
  createStudent,
  updateStudent,
  deleteStudent,
};
