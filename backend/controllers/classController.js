const prisma = require('../lib/prisma');

const getClasses = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const where = schoolId ? { schoolId } : {};
    const classes = await prisma.class.findMany({
      where,
      include: {
        classTeacher: true,
        _count: { select: { students: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

const getClassById = async (req, res) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        classTeacher: true,
        students: true,
        subjects: true
      }
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, section, schoolId, classTeacherId } = req.body;
    const parentCode = `CLS_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newClass = await prisma.class.create({
      data: {
        name,
        section,
        schoolId,
        classTeacherId,
        parentCode
      }
    });
    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create class' });
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass
};
