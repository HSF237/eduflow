const prisma = require('../lib/prisma');

const createAnnouncement = async (req, res) => {
  try {
    const { schoolId, classId, title, content, targetRole, attachments = [] } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        classId,
        title,
        content,
        targetRole: targetRole || null,
        createdBy: req.user?.userId || null,
        attachments
      }
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

const getAnnouncementsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [{ classId }, { classId: null }]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncementsByClass
};
