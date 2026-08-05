const prisma = require('../lib/prisma');

const getSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({ orderBy: { name: 'asc' } });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

const getSchoolById = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.params.id } });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch school' });
  }
};

const getSchoolByCode = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({ where: { code: req.params.code.toUpperCase() } });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch school by code' });
  }
};

const createSchool = async (req, res) => {
  try {
    const school = await prisma.school.create({ data: req.body });
    res.status(201).json(school);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create school' });
  }
};

const updateSchool = async (req, res) => {
  try {
    const school = await prisma.school.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update school' });
  }
};

module.exports = {
  getSchools,
  getSchoolById,
  getSchoolByCode,
  createSchool,
  updateSchool,
};
