const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_key';
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate Access & Refresh Tokens
 */
const generateTokens = async (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  // Store refresh token in database (expires in 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const { email, password, role = 'TEACHER', name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: role.toUpperCase(),
        name,
        phone,
      },
    });

    const tokens = await generateTokens(user);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      ...tokens,
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = await generateTokens(user);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      ...tokens,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!savedToken || savedToken.expiresAt < new Date()) {
      if (savedToken) {
        await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      }
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    try {
      jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (e) {
      await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      return res.status(403).json({ error: 'Invalid refresh token signature' });
    }

    // Delete old refresh token & generate new pair (Token Rotation)
    await prisma.refreshToken.delete({ where: { id: savedToken.id } });
    const newTokens = await generateTokens(savedToken.user);

    res.json({
      user: {
        id: savedToken.user.id,
        email: savedToken.user.email,
        role: savedToken.user.role,
        name: savedToken.user.name,
      },
      ...newTokens,
    });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(500).json({ error: 'Internal server error during token refresh' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout error' });
  }
};

/**
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true, name: true, phone: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  getCurrentUser,
};
