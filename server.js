require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LANGUAGES = ['English','Thai','Russian','Filipino','Myanmar','Chinese','German','French','Arabic','Indonesian'];

console.log('[STARTUP] BaanTask server starting...');
console.log('[STARTUP] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('[STARTUP] MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('[STARTUP] RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

// ── Resend ──
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('[STARTUP] Resend ready');
}

// ══════════════════════════════════════
//  MONGOOSE SCHEMAS — Full App
// ══════════════════════════════════════

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  pinHash: { type: String, default: '' },
  role: { type: String, enum: ['owner', 'worker'], required: true },
  lang: { type: String, default: 'English' },
  gender: { type: String, default: '' },
  dob: { type: String, default: '' },
  photo: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  createdAt: { type: Date, default: Date.now }
});
userSchema.index({ email: 1 });

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['house', 'condo', 'villa', 'other'], default: 'house' },
  location: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const workerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  jobRole: { type: String, default: '' }, // cleaner, cook, driver, nanny, gardener, other
  salary: { type: Number, default: 0 },
  contractType: { type: String, enum: ['live-in', 'live-out', 'other'], default: 'live-in' },
  skills: [{ type: String }],
  bio: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  joinDate: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  category: { type: String, default: '' },
  frequency: { type: String, enum: ['once', 'daily', 'weekly'], default: 'once' },
  dueDate: { type: Date, default: null },
  dueTime: { type: String, default: '' },
  priority: { type: String, enum: ['urgent', 'normal', 'low'], default: 'normal' },
  status: { type: String, enum: ['not-started', 'in-progress', 'done'], default: 'not-started' },
  translations: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['present', 'late', 'absent', 'off'], default: 'present' },
  checkInTime: { type: Date, default: null },
  reason: { type: String, default: '' }
});

const expenseSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  category: { type: String, default: '' },
  store: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  receiptImage: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'reimbursed'], default: 'pending' }
});

const chatSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, default: '' },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderLang: { type: String, default: 'English' },
  text: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Message' },
  translations: { type: Map, of: String, default: {} },
  reactions: { type: Map, of: [String], default: {} },
  pinned: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  contact: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);
const Task = mongoose.model('Task', taskSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Chat = mongoose.model('Chat', chatSchema);
const Message = mongoose.model('Message', messageSchema);
const OTP = mongoose.model('OTP', otpSchema);

// ── Connect to MongoDB ──
let dbConnected = false;
async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) { console.error('[DB] MONGODB_URI not set!'); return; }
  try {
    const url = new URL(uri);
    if (!url.pathname || url.pathname === '/' || url.pathname === '') { url.pathname = '/baantask'; uri = url.toString(); }
  } catch (e) { /* */ }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000 });
    dbConnected = true;
    console.log('[DB] Connected to MongoDB Atlas');
  } catch (e) { console.error('[DB] Connection failed:', e.message); }
}

// ── Helpers ──
function genCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── Translate ──
async function translateOne(text, fromLang, toLang) {
  if (!process.env.ANTHROPIC_API_KEY || fromLang === toLang) return null;
  try {
    const r = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 500,
      messages: [{ role: 'user', content: `Translate from ${fromLang} to ${toLang}. Output ONLY the translation.\n\n${text}` }]
    });
    return r.content[0].text.trim();
  } catch (e) { return null; }
}

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { contact, name } = req.body;
  if (!contact) return res.status(400).json({ ok: false, error: 'Email required' });
  const nc = contact.trim().toLowerCase();
  const code = genOTP();
  try { await OTP.create({ contact: nc, otp: code, expiresAt: new Date(Date.now() + 10 * 60000) }); } catch (e) { /**/ }

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: 'BaanTask <onboarding@resend.dev>', to: [nc],
        subject: 'Your BaanTask verification code',
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;"><h2 style="color:#075e54;">BaanTask</h2><p>Hi ${name || 'there'},</p><p>Your code:</p><div style="background:#f0f4f0;border-radius:12px;padding:24px;text-align:center;margin:16px 0;"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#075e54;">${code}</span></div><p style="color:#999;font-size:13px;">Expires in 10 minutes.</p></div>`
      });
      if (!error) { console.log(`[OTP] Sent to ${nc}`); return res.json({ ok: true, method: 'email' }); }
    } catch (e) { /**/ }
  }
  console.log(`[OTP CODE] ====> ${code} <==== for ${nc}`);
  res.json({ ok: true, method: 'console' });
});

// Verify OTP + register/login
app.post('/api/verify-otp', async (req, res) => {
  const { contact, otp, name, pin, lang, role } = req.body;
  if (!contact || !otp || !name || !pin || !lang) return res.status(400).json({ ok: false, error: 'All fields required' });
  const nc = contact.trim().toLowerCase();
  try {
    const record = await OTP.findOne({ contact: nc, otp: String(otp).trim(), expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!record) return res.json({ ok: false, error: 'Invalid or expired code' });
    await OTP.deleteMany({ contact: nc });

    const pinHash = await bcrypt.hash(pin, 10);
    let user = await User.findOne({ email: nc });
    if (user) {
      user.pinHash = pinHash; user.lang = lang; user.name = name;
      if (role) user.role = role;
      user.emailVerified = true;
      await user.save();
    } else {
      user = await User.create({ name, email: nc, pinHash, lang, role: role || 'owner', emailVerified: true });
    }
    console.log(`[AUTH] Verified + logged in: ${name} (${user.role})`);
    res.json({ ok: true, user: { id: user._id, name: user.name, role: user.role, lang: user.lang, propertyId: user.propertyId } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PIN login (returning users)
app.post('/api/login', async (req, res) => {
  const { email, pin, lang } = req.body;
  if (!email || !pin) return res.status(400).json({ ok: false, error: 'Email and PIN required' });
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.json({ ok: false, error: 'Account not found' });
    if (!user.pinHash) return res.json({ ok: false, error: 'Please verify email first' });
    const match = await bcrypt.compare(pin, user.pinHash);
    if (!match) return res.json({ ok: false, error: 'Wrong PIN' });
    if (lang) { user.lang = lang; await user.save(); }
    console.log(`[LOGIN] ${user.name} (${user.role})`);
    res.json({ ok: true, user: { id: user._id, name: user.name, role: user.role, lang: user.lang, email: user.email, phone: user.phone, gender: user.gender, dob: user.dob, propertyId: user.propertyId } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  OWNER SETUP ROUTES
// ══════════════════════════════════════

// Update owner profile (gender, dob, phone)
app.post('/api/user/update', async (req, res) => {
  const { userId, name, phone, gender, dob } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;
    await user.save();
    res.json({ ok: true, user: { id: user._id, name: user.name, phone: user.phone, gender: user.gender, dob: user.dob } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Create property
app.post('/api/property/create', async (req, res) => {
  const { ownerId, name, type, location } = req.body;
  if (!ownerId || !name) return res.status(400).json({ ok: false, error: 'Owner ID and property name required' });
  try {
    const code = genCode();
    const prop = await Property.create({ name, type: type || 'house', location: location || '', ownerId, inviteCode: code });
    // Link property to owner
    await User.findByIdAndUpdate(ownerId, { propertyId: prop._id });
    // Create group chat for the property
    await Chat.create({ propertyId: prop._id, type: 'group', members: [ownerId], name: `${name} Staff` });
    console.log(`[PROPERTY] Created "${name}" (${type}) code=${code}`);
    res.json({ ok: true, property: { id: prop._id, name: prop.name, type: prop.type, location: prop.location, inviteCode: prop.inviteCode } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Get property
app.get('/api/property/:id', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.json({ ok: false, error: 'Not found' });
    const workers = await WorkerProfile.find({ propertyId: prop._id }).populate('userId', 'name email phone lang');
    res.json({ ok: true, property: prop, workers });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  WORKER ROUTES
// ══════════════════════════════════════

// Worker joins via invite code
app.post('/api/worker/join', async (req, res) => {
  const { userId, inviteCode, jobRole, salary } = req.body;
  if (!userId || !inviteCode) return res.status(400).json({ ok: false, error: 'userId and inviteCode required' });
  try {
    const prop = await Property.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!prop) return res.json({ ok: false, error: 'Invalid invite code' });

    // Check if already joined
    const existing = await WorkerProfile.findOne({ userId, propertyId: prop._id });
    if (existing) return res.json({ ok: true, message: 'Already a member', propertyId: prop._id });

    await WorkerProfile.create({ userId, propertyId: prop._id, jobRole: jobRole || '', salary: salary || 0 });
    await User.findByIdAndUpdate(userId, { propertyId: prop._id, role: 'worker' });
    // Add to group chat
    const groupChat = await Chat.findOne({ propertyId: prop._id, type: 'group' });
    if (groupChat && !groupChat.members.some(m => m.toString() === userId.toString())) {
      groupChat.members.push(userId);
      await groupChat.save();
    }
    console.log(`[WORKER] Joined property "${prop.name}"`);
    res.json({ ok: true, propertyId: prop._id, propertyName: prop.name });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// List workers for a property
app.get('/api/workers/:propertyId', async (req, res) => {
  try {
    const profiles = await WorkerProfile.find({ propertyId: req.params.propertyId, status: 'active' }).populate('userId', 'name email phone lang');
    res.json({ ok: true, workers: profiles });
  } catch (e) { res.json({ ok: true, workers: [] }); }
});

// ══════════════════════════════════════
//  TASK ROUTES
// ══════════════════════════════════════

app.post('/api/tasks/create', async (req, res) => {
  const { propertyId, title, description, assigneeId, category, frequency, dueDate, dueTime, priority } = req.body;
  if (!propertyId || !title) return res.status(400).json({ ok: false, error: 'Property and title required' });
  try {
    const task = await Task.create({ propertyId, title, description, assigneeId, category, frequency, dueDate, dueTime, priority });
    res.json({ ok: true, task });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/tasks/:propertyId', async (req, res) => {
  try {
    const tasks = await Task.find({ propertyId: req.params.propertyId }).sort({ createdAt: -1 }).populate('assigneeId', 'name');
    res.json({ ok: true, tasks });
  } catch (e) { res.json({ ok: true, tasks: [] }); }
});

app.post('/api/tasks/update', async (req, res) => {
  const { taskId, status, title, description, assigneeId, priority } = req.body;
  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ ok: false });
    if (status) task.status = status;
    if (title) task.title = title;
    if (description) task.description = description;
    if (assigneeId) task.assigneeId = assigneeId;
    if (priority) task.priority = priority;
    await task.save();
    res.json({ ok: true, task });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  CHAT / MESSAGE ROUTES (kept for Phase 5)
// ══════════════════════════════════════

app.get('/api/chats/:propertyId/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ propertyId: req.params.propertyId, members: req.params.userId }).sort({ lastMessageAt: -1 });
    res.json({ ok: true, chats });
  } catch (e) { res.json({ ok: true, chats: [] }); }
});

// ══════════════════════════════════════
//  HEALTH / ADMIN
// ══════════════════════════════════════

app.get('/status', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.json({ db: dbOk, api: !!process.env.ANTHROPIC_API_KEY, resend: !!resend });
});

app.get('/admin/clear-messages', async (req, res) => {
  try { const r = await Message.deleteMany({}); res.json({ ok: true, deleted: r.deletedCount }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Start ──
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`[STARTUP] BaanTask running on port ${PORT}`));
});
