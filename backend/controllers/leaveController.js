const prisma = require('../lib/prisma');

const applyLeave = async (req, res) => {
  try {
    const { schoolId, classId, studentId, startDate, endDate, reason } = req.body;
    const leave = await prisma.leaveRequest.create({
      data: {
        schoolId,
        classId,
        studentId,
        parentId: req.user?.userId || null,
        startDate,
        endDate,
        reason,
        status: 'PENDING'
      }
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
};

const getLeaveRequestsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const requests = await prisma.leaveRequest.findMany({
      where: { classId },
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: { status }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update leave status' });
  }
};

module.exports = {
  applyLeave,
  getLeaveRequestsByClass,
  updateLeaveStatus
};
