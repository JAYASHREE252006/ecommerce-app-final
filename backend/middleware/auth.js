const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Attaches req.userId / req.user when a valid token is present.
 * Does NOT reject the request if the token is missing or invalid -
 * used on endpoints (like "record a view") that must work for guests too.
 */
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
    // Invalid/expired token on an optional-auth route -> treat as guest, don't fail the request.
    next();
  }
}

/**
 * Rejects the request unless a valid token is present.
 * SECURITY: req.userId always comes from the verified token, never from
 * req.body/req.params/req.query, so a user can never impersonate another.
 */
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
