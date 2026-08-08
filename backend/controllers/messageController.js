const prisma = require('../lib/prisma');

const sendMessage = async (req, res) => {
  try {
    const { schoolId, studentId, content, senderRole, attachments = [] } = req.body;
    const message = await prisma.message.create({
      data: {
        schoolId,
        studentId,
        senderId: req.user?.userId || 'usr_demo',
        senderRole: senderRole || 'TEACHER',
        content,
        attachments
      }
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const getMessagesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const messages = await prisma.message.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

module.exports = {
  sendMessage,
  getMessagesByStudent
};
