const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user) {
      req.userId = user._id;
      req.user = user;
    }
    next();
  } catch (err) {
    next();
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    req.userId = user._id;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth, optionalAuth };
