const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create({ name, email, password });
  const token = signToken(user._id);
  ok(res, { user: user.toSafeJSON(), token }, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const token = signToken(user._id);
  ok(res, { user: user.toSafeJSON(), token });
});

const me = asyncHandler(async (req, res) => {
  ok(res, { user: req.user.toSafeJSON() });
});

const updateThemePreference = asyncHandler(async (req, res) => {
  const { themePreference } = req.body;
  if (!['light', 'dark', 'system'].includes(themePreference)) {
    throw new ApiError(400, "themePreference must be 'light', 'dark', or 'system'");
  }
  req.user.themePreference = themePreference;
  await req.user.save();
  ok(res, { user: req.user.toSafeJSON() });
});

module.exports = { register, login, me, updateThemePreference };
