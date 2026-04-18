require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'baantask-default-jwt-secret-2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const client = new Anthropic();

app.use(express.json({ limit: '5mb' }));

// CORS — allow custom domain and Render domain
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Quick health ping
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

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
  name: { type: String, required: true, unique: false },
  email: { type: String, default: '', unique: true, sparse: true },
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
    // Drop stale unique index on name if it exists
    try { await mongoose.connection.db.collection('users').dropIndex('name_1'); console.log('[DB] Dropped stale name_1 index'); } catch (e) { /**/ }
    // Run repairs in background (don't block server start)
    setTimeout(async () => {
      try { await repairAllGroupChats(); } catch (e) { console.error('[REPAIR ERR]', e.message); }
    }, 2000);
  } catch (e) { console.error('[DB] Connection failed:', e.message); }
}

// ── Auto-repair group chats on startup ──
async function repairAllGroupChats() {
  const props = await Property.find({});
  for (const prop of props) {
    // Collect all member IDs: owner + all active workers
    const memberIds = [prop.ownerId.toString()];
    const workers = await WorkerProfile.find({ propertyId: prop._id, status: 'active' });
    for (const w of workers) memberIds.push(w.userId.toString());
    // Also find users directly linked to this property
    const users = await User.find({ propertyId: prop._id, role: 'worker' }, '_id');
    for (const u of users) {
      const uid = u._id.toString();
      if (!memberIds.includes(uid)) memberIds.push(uid);
      // Ensure WorkerProfile exists
      const hasWP = workers.some(w => w.userId.toString() === uid);
      if (!hasWP) {
        await WorkerProfile.create({ userId: u._id, propertyId: prop._id, jobRole: '', status: 'active' });
        console.log(`[REPAIR] Created WorkerProfile for user ${uid}`);
      }
    }
    // Find or create group chat
    let gc = await Chat.findOne({ propertyId: prop._id, type: 'group' });
    if (!gc) {
      gc = await Chat.create({ propertyId: prop._id, type: 'group', members: memberIds.map(id => new mongoose.Types.ObjectId(id)), name: prop.name + ' Staff' });
      console.log(`[REPAIR] Created group chat for "${prop.name}" with ${memberIds.length} members`);
    } else {
      // Ensure all members are in the group chat
      let changed = false;
      for (const mid of memberIds) {
        if (!gc.members.some(m => m.toString() === mid)) {
          gc.members.push(new mongoose.Types.ObjectId(mid));
          changed = true;
        }
      }
      if (changed) {
        await gc.save();
        console.log(`[REPAIR] Updated group chat for "${prop.name}" → ${gc.members.length} members`);
      }
    }
  }
  console.log(`[REPAIR] Checked ${props.length} properties`);
  // Remove worker-to-worker DMs
  const dms = await Chat.find({ type: 'direct' }).lean();
  for (const dm of dms) {
    if (dm.members.length === 2) {
      const [m1, m2] = await Promise.all([User.findById(dm.members[0], 'role'), User.findById(dm.members[1], 'role')]);
      if (m1 && m2 && m1.role === 'worker' && m2.role === 'worker') {
        await Message.deleteMany({ chatId: dm._id });
        await Chat.deleteOne({ _id: dm._id });
        console.log(`[REPAIR] Removed worker-to-worker DM ${dm._id}`);
      }
    }
  }
}

// ── Helpers ──
function genCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }
function signToken(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}
function userPayload(user, token) {
  return { id: user._id, name: user.name, role: user.role, lang: user.lang, email: user.email, phone: user.phone, gender: user.gender, dob: user.dob, propertyId: user.propertyId, token };
}

// ── Translate ──
// Normalize language names — Claude might detect "Tagalog" but we store "Filipino"
const LANG_ALIASES = { Tagalog:'Filipino', 'Filipino/Tagalog':'Filipino', Burmese:'Myanmar', Mandarin:'Chinese', 'Mandarin Chinese':'Chinese', 'Simplified Chinese':'Chinese', 'Traditional Chinese':'Chinese' };
function normLang(lang) { return LANG_ALIASES[lang] || lang; }

const TRANSLATION_SYSTEM = `You are an expert professional translator specializing in household employer-employee communication in Asia.

CONTEXT: This is a conversation between a property owner and their household staff (driver, cleaner, cook, nanny, gardener, security guard). Messages are about daily tasks, schedules, house matters, and general communication.

TRANSLATION RULES:
- Translate the MEANING and INTENT, not word-for-word
- Use natural conversational tone, not robotic or overly formal
- Understand context: 'leave' in travel = depart/go NOT abandon; 'take care' = look after; 'follow up' = check on progress
- Filipino: 'we will leave/go' = 'aalis kami' NOT 'iiwan natin'; 'we' exclusive = 'kami', inclusive = 'tayo'; use 'po'/'opo' appropriately
- Thai: polite particles ครับ/ค่ะ; 'leave/depart' = ออกเดินทาง NOT ทิ้ง
- Burmese: polite natural Burmese with appropriate honorifics
- Indonesian: 'pergi' for leave/depart NOT 'tinggalkan'
- Russian: natural conversational Russian
- Chinese: simplified characters, conversational tone
- Arabic: Modern Standard Arabic, respectful employer context
- Japanese: polite form 丁寧語 for work setting
- Korean: 존댓말 for worker-to-owner, polite casual for owner-to-worker
- Hindi: natural Hindi, 'जाना' for leave/depart
- Spanish: 'salir' for leave/depart NOT 'dejar'
- French: 'partir' for leave/depart NOT 'laisser'
- German: 'abreisen/abfahren' for leave/depart
- "Filipino" means Tagalog/Filipino language; "Myanmar" means Burmese language`;

async function detectAndTranslate(text, targetLangs) {
  if (!process.env.ANTHROPIC_API_KEY || !targetLangs.length) return { detectedLang: 'English', translations: {} };
  try {
    const r = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      system: TRANSLATION_SYSTEM,
      messages: [{ role: 'user', content: `Detect the language of this message and translate it to each target language.

Message: ${JSON.stringify(text)}

Target languages: ${targetLangs.join(', ')}

Respond with ONLY valid JSON, no markdown fences, no explanation:
{"detectedLang":"<language name>","translations":{${targetLangs.map(l => `"${l}":"<translation>"`).join(',')}}}

If already in a target language, copy original text as that translation.` }]
    });
    let raw = r.content[0].text.trim();
    if (raw.startsWith('```')) { raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim(); }
    const parsed = JSON.parse(raw);
    parsed.detectedLang = normLang(parsed.detectedLang || 'English');
    console.log(`[TRANSLATE] Detected: ${parsed.detectedLang}, targets: ${targetLangs.join(', ')}`);
    return parsed;
  } catch (e) {
    console.error('[TRANSLATE ERROR]', e.message);
    return { detectedLang: 'English', translations: {} };
  }
}

// Fallback single translation
async function translateOne(text, fromLang, toLang) {
  if (!process.env.ANTHROPIC_API_KEY || fromLang === toLang) return null;
  try {
    const r = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 500,
      system: TRANSLATION_SYSTEM,
      messages: [{ role: 'user', content: `Translate from ${fromLang} to ${toLang}. Output ONLY the translated text, nothing else.\n\n${text}` }]
    });
    return r.content[0].text.trim();
  } catch (e) { return null; }
}

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// Check if email already registered
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false });
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }, 'name role lang propertyId');
    if (user) return res.json({ ok: true, exists: true, user: { name: user.name, role: user.role, lang: user.lang, hasProperty: !!user.propertyId } });
    res.json({ ok: true, exists: false });
  } catch (e) { res.json({ ok: true, exists: false }); }
});

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
        from: 'BaanTask <noreply@baantask.app>', to: [nc],
        subject: 'Your BaanTask verification code',
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;"><h2 style="color:#1B5E20;">BaanTask</h2><p>Hi ${name || 'there'},</p><p>Your verification code:</p><div style="background:#f0f4f0;border-radius:12px;padding:24px;text-align:center;margin:16px 0;"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1B5E20;">${code}</span></div><p style="color:#999;font-size:13px;">Expires in 10 minutes.</p></div>`
      });
      if (!error) { console.log(`[OTP] Sent to ${nc}`); return res.json({ ok: true, method: 'email' }); }
      console.error('[OTP] Resend error:', error);
    } catch (e) { console.error('[OTP] Send failed:', e.message); }
  }
  console.log(`[OTP CODE] ====> ${code} <==== for ${nc}`);
  res.json({ ok: true, method: 'console' });
});

// Verify OTP only (for returning users — no PIN change)
app.post('/api/verify-otp-only', async (req, res) => {
  const { contact, otp } = req.body;
  console.log(`[VERIFY-OTP-ONLY] contact=${contact} otp=${otp ? '***' : 'missing'}`);
  if (!contact || !otp) return res.status(400).json({ ok: false, error: 'Email and code required' });
  const nc = contact.trim().toLowerCase();
  try {
    const record = await OTP.findOne({ contact: nc, otp: String(otp).trim(), expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!record) return res.json({ ok: false, error: 'Invalid or expired code' });
    await OTP.deleteMany({ contact: nc });
    const user = await User.findOne({ email: nc });
    if (!user) return res.json({ ok: false, error: 'Account not found' });
    user.emailVerified = true;
    await user.save();
    // Check if user has a REAL PIN set
    let hasPin = false;
    if (user.pinHash && typeof user.pinHash === 'string' && user.pinHash.length > 10) {
      try {
        const isPlaceholder = await bcrypt.compare('0000', user.pinHash);
        hasPin = !isPlaceholder;
      } catch(e) { hasPin = false; }
    }
    const token = signToken(user);
    console.log(`[AUTH] OTP-only verify: ${user.name} (${user.role}) hasPin=${hasPin}`);
    res.json({ ok: true, hasPin, user: userPayload(user, token) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Verify OTP + register/login
app.post('/api/verify-otp', async (req, res) => {
  const { contact, otp, name, pin, lang, role, skipOtp } = req.body;
  console.log(`[VERIFY-OTP] contact=${contact} name=${name} role=${role} skipOtp=${skipOtp} hasPin=${!!pin}`);
  if (!contact || !name || !pin || !lang) return res.status(400).json({ ok: false, error: 'All fields required' });
  const nc = contact.trim().toLowerCase();
  try {
    // skipOtp allows updating role/PIN for already-verified users
    if (!skipOtp) {
      const record = await OTP.findOne({ contact: nc, otp: String(otp).trim(), expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
      if (!record) return res.json({ ok: false, error: 'Invalid or expired code' });
      await OTP.deleteMany({ contact: nc });
    }

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
    const token = signToken(user);
    console.log(`[AUTH] Verified + logged in: ${name} (${user.role})`);
    res.json({ ok: true, user: userPayload(user, token) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PIN login (returning users)
app.post('/api/login', async (req, res) => {
  const { email, pin, lang } = req.body;
  if (!email || !pin) return res.status(400).json({ ok: false, error: 'Email and PIN required' });
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.json({ ok: false, error: 'Account not found' });
    if (!user.pinHash || typeof user.pinHash !== 'string' || user.pinHash.length < 10) return res.json({ ok: false, error: 'No PIN set. Please log in with email + OTP first.' });
    const match = await bcrypt.compare(pin, user.pinHash);
    if (!match) return res.json({ ok: false, error: 'Wrong PIN' });
    if (lang) { user.lang = lang; await user.save(); }
    const token = signToken(user);
    console.log(`[LOGIN] ${user.name} (${user.role})`);
    res.json({ ok: true, user: userPayload(user, token) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Set/change PIN for a user
app.post('/api/set-pin', async (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !pin || pin.length !== 4) return res.status(400).json({ ok: false, error: '4-digit PIN required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    user.pinHash = await bcrypt.hash(pin, 10);
    await user.save();
    const token = signToken(user);
    console.log(`[PIN] Set PIN for ${user.name}`);
    res.json({ ok: true, user: userPayload(user, token) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Token-based auto-login — validate JWT and return fresh user data
app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.json({ ok: false });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.json({ ok: false });
    const token = signToken(user); // refresh token
    res.json({ ok: true, user: userPayload(user, token) });
  } catch (e) { res.json({ ok: false }); }
});

// ══════════════════════════════════════
//  OWNER SETUP ROUTES
// ══════════════════════════════════════

// Update owner profile (gender, dob, phone)
app.post('/api/user/update', async (req, res) => {
  const { userId, name, phone, gender, dob, lang } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;
    if (lang) user.lang = lang;
    await user.save();
    res.json({ ok: true, user: { id: user._id, name: user.name, phone: user.phone, gender: user.gender, dob: user.dob, lang: user.lang } });
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
    if (existing) {
      // Reactivate if inactive
      if (existing.status === 'inactive') { existing.status = 'active'; await existing.save(); }
      if (jobRole && !existing.jobRole) { existing.jobRole = jobRole; await existing.save(); }
    } else {
      await WorkerProfile.create({ userId, propertyId: prop._id, jobRole: jobRole || '', salary: salary || 0 });
    }
    await User.findByIdAndUpdate(userId, { propertyId: prop._id, role: 'worker' });

    // Ensure group chat exists and both owner + worker are in it
    let groupChat = await Chat.findOne({ propertyId: prop._id, type: 'group' });
    if (!groupChat) {
      // Create group chat if missing
      groupChat = await Chat.create({ propertyId: prop._id, type: 'group', members: [prop.ownerId, userId], name: `${prop.name} Staff` });
      console.log(`[REPAIR] Created missing group chat for "${prop.name}"`);
    } else {
      let changed = false;
      // Ensure owner is in group chat
      if (!groupChat.members.some(m => m.toString() === prop.ownerId.toString())) {
        groupChat.members.push(prop.ownerId);
        changed = true;
      }
      // Ensure worker is in group chat
      if (!groupChat.members.some(m => m.toString() === userId.toString())) {
        groupChat.members.push(userId);
        changed = true;
      }
      if (changed) await groupChat.save();
    }

    const user = await User.findById(userId, 'name');
    console.log(`[WORKER] ${user ? user.name : userId} joined property "${prop.name}" as ${jobRole || 'staff'}`);
    res.json({ ok: true, propertyId: prop._id, propertyName: prop.name });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// List workers for a property — also repairs broken links
app.get('/api/workers/:propertyId', async (req, res) => {
  try {
    // Find workers via WorkerProfile
    let profiles = await WorkerProfile.find({ propertyId: req.params.propertyId, status: 'active' }).populate('userId', 'name email phone lang');

    // Also find users with this propertyId who might not have a WorkerProfile
    const users = await User.find({ propertyId: req.params.propertyId, role: 'worker' }, 'name email phone lang');
    for (const u of users) {
      const hasProfile = profiles.some(p => p.userId && p.userId._id && p.userId._id.toString() === u._id.toString());
      if (!hasProfile) {
        // Auto-create missing WorkerProfile
        const wp = await WorkerProfile.create({ userId: u._id, propertyId: req.params.propertyId, jobRole: '', status: 'active' });
        const populated = await WorkerProfile.findById(wp._id).populate('userId', 'name email phone lang');
        profiles.push(populated);
        console.log(`[REPAIR] Created missing WorkerProfile for ${u.name}`);
      }
    }

    // Ensure all workers are in the group chat
    const groupChat = await Chat.findOne({ propertyId: req.params.propertyId, type: 'group' });
    if (groupChat) {
      let chatChanged = false;
      for (const p of profiles) {
        if (p.userId && p.userId._id) {
          const uid = p.userId._id.toString();
          if (!groupChat.members.some(m => m.toString() === uid)) {
            groupChat.members.push(p.userId._id);
            chatChanged = true;
            console.log(`[REPAIR] Added ${p.userId.name} to group chat`);
          }
        }
      }
      if (chatChanged) await groupChat.save();
    }

    res.json({ ok: true, workers: profiles });
  } catch (e) { res.json({ ok: true, workers: [] }); }
});

// Remove worker from property
app.post('/api/worker/remove', async (req, res) => {
  const { profileId, propertyId } = req.body;
  if (!profileId) return res.status(400).json({ ok: false, error: 'profileId required' });
  try {
    const wp = await WorkerProfile.findById(profileId);
    if (!wp) return res.status(404).json({ ok: false, error: 'Not found' });
    wp.status = 'inactive';
    await wp.save();
    // Remove from group chat
    const groupChat = await Chat.findOne({ propertyId: wp.propertyId, type: 'group' });
    if (groupChat) {
      groupChat.members = groupChat.members.filter(m => m.toString() !== wp.userId.toString());
      await groupChat.save();
    }
    console.log(`[WORKER] Removed worker profile ${profileId}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  ATTENDANCE ROUTES
// ══════════════════════════════════════

app.post('/api/attendance/log', async (req, res) => {
  const { propertyId, workerId, date, status, checkInTime, reason } = req.body;
  if (!propertyId || !workerId || !date) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    // Upsert — one record per worker per day
    const record = await Attendance.findOneAndUpdate(
      { propertyId, workerId, date },
      { status: status || 'present', checkInTime: checkInTime || new Date(), reason: reason || '' },
      { upsert: true, new: true }
    );
    res.json({ ok: true, attendance: record });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/attendance/:propertyId', async (req, res) => {
  const { month } = req.query; // YYYY-MM
  try {
    const query = { propertyId: req.params.propertyId };
    if (month) { query.date = { $regex: '^' + month }; }
    const records = await Attendance.find(query).populate('workerId', 'name').sort({ date: -1 });
    res.json({ ok: true, attendance: records });
  } catch (e) { res.json({ ok: true, attendance: [] }); }
});

// ══════════════════════════════════════
//  EXPENSE ROUTES
// ══════════════════════════════════════

app.post('/api/expenses/create', async (req, res) => {
  const { propertyId, workerId, amount, category, store, receiptImage } = req.body;
  if (!propertyId || !amount) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    const expense = await Expense.create({ propertyId, workerId, amount, category, store, receiptImage });
    res.json({ ok: true, expense });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/expenses/:propertyId', async (req, res) => {
  try {
    const expenses = await Expense.find({ propertyId: req.params.propertyId }).populate('workerId', 'name').sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ ok: true, expenses, total });
  } catch (e) { res.json({ ok: true, expenses: [], total: 0 }); }
});

app.post('/api/expenses/update', async (req, res) => {
  const { expenseId, status } = req.body;
  if (!expenseId || !status) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    const expense = await Expense.findByIdAndUpdate(expenseId, { status }, { new: true });
    if (!expense) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, expense });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
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

// Get tasks assigned to a specific worker
app.get('/api/tasks/:propertyId/worker/:workerId', async (req, res) => {
  try {
    const tasks = await Task.find({ propertyId: req.params.propertyId, assigneeId: req.params.workerId }).sort({ createdAt: -1 });
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
//  CHAT / MESSAGE ROUTES
// ══════════════════════════════════════

// List all chats for a user (group + DMs), with member names + real last message
// For workers: filters out worker-to-worker DMs, only shows owner DMs + group
app.get('/api/chats/:propertyId/:userId', async (req, res) => {
  try {
    let uid;
    try { uid = new mongoose.Types.ObjectId(req.params.userId); } catch(e) { uid = req.params.userId; }
    let chats = await Chat.find({ propertyId: req.params.propertyId, members: uid })
      .sort({ lastMessageAt: -1 }).lean();

    // Check if this user is a worker — if so, filter DMs to owner-only
    const thisUser = await User.findById(req.params.userId, 'role');
    if (thisUser && thisUser.role === 'worker') {
      const prop = await Property.findById(req.params.propertyId, 'ownerId');
      const ownerId = prop ? prop.ownerId.toString() : '';
      chats = chats.filter(c => {
        if (c.type === 'group') return true; // always show group chat
        // For DMs, only keep if the other member is the owner
        const otherMember = c.members.find(m => m.toString() !== req.params.userId);
        return otherMember && otherMember.toString() === ownerId;
      });
    }

    for (const c of chats) {
      const users = await User.find({ _id: { $in: c.members } }, 'name lang role').lean();
      c.memberDetails = users.map(u => ({ id: u._id.toString(), name: u.name, lang: u.lang, role: u.role }));
      const lastMsg = await Message.findOne({ chatId: c._id }).sort({ createdAt: -1 }).lean();
      c.lastMessage = lastMsg ? lastMsg.text : '';
    }
    res.json({ ok: true, chats });
  } catch (e) { res.json({ ok: true, chats: [] }); }
});

// Find or create a direct chat — only owner↔worker allowed, no worker↔worker
app.post('/api/chats/direct', async (req, res) => {
  const { propertyId, userId1, userId2 } = req.body;
  if (!propertyId || !userId1 || !userId2) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    // Block worker-to-worker DMs
    const u1 = await User.findById(userId1, 'name role');
    const u2 = await User.findById(userId2, 'name role');
    if (u1 && u2 && u1.role === 'worker' && u2.role === 'worker') {
      return res.status(403).json({ ok: false, error: 'Workers can only message the owner directly' });
    }
    // Find or create DM
    let chat = await Chat.findOne({
      propertyId, type: 'direct',
      members: { $all: [userId1, userId2], $size: 2 }
    });
    if (!chat) {
      chat = await Chat.create({
        propertyId, type: 'direct',
        members: [userId1, userId2],
        name: `${u1 ? u1.name : ''} & ${u2 ? u2.name : ''}`
      });
      console.log(`[CHAT] Created DM: ${chat.name}`);
    }
    res.json({ ok: true, chat });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Get messages — translate on-the-fly to viewer's language, cache result
app.get('/api/messages/:chatId', async (req, res) => {
  const viewerLang = normLang(req.query.lang || 'English');
  try {
    const msgs = await Message.find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 }).populate('senderId', 'name lang').lean();

    const result = [];
    for (const m of msgs) {
      const t = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      const senderName = m.senderId && m.senderId.name ? m.senderId.name : 'Unknown';
      const senderId = m.senderId && m.senderId._id ? m.senderId._id.toString() : (m.senderId ? m.senderId.toString() : '');
      const sLang = normLang(m.senderLang || 'English');

      // Only translate if viewer's language differs from sender's
      let translation = null;
      if (sLang !== viewerLang) {
        // Check cache first
        translation = t[viewerLang] || null;
        if (!translation) {
          // Case-insensitive fallback
          const key = Object.keys(t).find(k => normLang(k) === viewerLang);
          if (key) translation = t[key];
        }
        // Not cached → translate on-the-fly and save to DB
        if (!translation) {
          const tr = await translateOne(m.text, sLang, viewerLang);
          if (tr) {
            translation = tr;
            // Cache it in the message document for next time
            await Message.updateOne({ _id: m._id }, { $set: { [`translations.${viewerLang}`]: tr } });
          }
        }
      }

      result.push({
        id: m._id.toString(), senderId, senderName, senderLang: sLang,
        text: m.text, translation, time: m.createdAt
      });
    }
    res.json({ ok: true, messages: result });
  } catch (e) {
    console.error('[MESSAGES ERROR]', e.message);
    res.json({ ok: true, messages: [] });
  }
});

// Send a message — detect language, save. Translation happens per-viewer on read.
app.post('/api/messages/send', async (req, res) => {
  const { chatId, senderId, text } = req.body;
  if (!chatId || !senderId || !text) return res.status(400).json({ ok: false, error: 'Missing fields' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ ok: false, error: 'Chat not found' });

    // Auto-detect the sender's language
    let detectedLang = 'English';
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const dr = await client.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 50,
          messages: [{ role: 'user', content: `What language is this message written in? Reply with ONLY the language name in English (e.g. "English", "Filipino", "Thai", "Russian"). Message: "${text}"` }]
        });
        detectedLang = normLang(dr.content[0].text.trim().replace(/[".]/g, ''));
      } catch(e) {}
    }
    console.log(`[MSG] Detected language: ${detectedLang}`);

    const msg = await Message.create({
      chatId, senderId, senderLang: detectedLang,
      text, translations: {}
    });

    // Update chat's lastMessage
    await Chat.findByIdAndUpdate(chatId, { lastMessage: text, lastMessageAt: new Date() });

    // Get sender name for the real-time event
    const sender = await User.findById(senderId, 'name');
    const senderName = sender ? sender.name : 'Unknown';

    const payload = {
      chatId: String(chatId),
      id: msg._id.toString(),
      senderId: String(senderId),
      senderName,
      senderLang: detectedLang,
      text,
      time: msg.createdAt
    };

    // Emit to chatId room (for group chats and any listener)
    const chatRoom = 'group:' + chatId;
    io.to(chatRoom).emit('message', payload);
    console.log(`[WS EMIT] → ${chatRoom}`);

    // Also emit to sorted-pair rooms (for DMs)
    const memberIds = chat.members.map(m => m.toString());
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const roomId = makeRoomId(memberIds[i], memberIds[j]);
        io.to(roomId).emit('message', payload);
        console.log(`[WS EMIT] → ${roomId}`);
      }
    }

    console.log(`[MSG] ${senderName} [${detectedLang}] in ${chatId}: "${text.substring(0, 40)}"`);
    res.json({ ok: true, id: msg._id.toString(), detectedLang });
  } catch (e) {
    console.error('[MSG SEND ERROR]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete a message (sender only)
app.post('/api/messages/delete', async (req, res) => {
  const { messageId, userId } = req.body;
  if (!messageId || !userId) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ ok: false, error: 'Not found' });
    if (msg.senderId.toString() !== userId) return res.status(403).json({ ok: false, error: 'Not your message' });
    await Message.deleteOne({ _id: messageId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  HEALTH / ADMIN
// ══════════════════════════════════════

// Repair all worker-property links and group chat membership
app.get('/admin/repair-links', async (req, res) => {
  try {
    const fixes = [];
    // Find all workers with a propertyId
    const workers = await User.find({ role: 'worker', propertyId: { $ne: null } });
    for (const w of workers) {
      // Ensure WorkerProfile exists
      let wp = await WorkerProfile.findOne({ userId: w._id, propertyId: w.propertyId });
      if (!wp) {
        wp = await WorkerProfile.create({ userId: w._id, propertyId: w.propertyId, jobRole: '', status: 'active' });
        fixes.push(`Created WorkerProfile for ${w.name}`);
      } else if (wp.status === 'inactive') {
        wp.status = 'active'; await wp.save();
        fixes.push(`Reactivated WorkerProfile for ${w.name}`);
      }
      // Ensure worker is in group chat
      let gc = await Chat.findOne({ propertyId: w.propertyId, type: 'group' });
      if (!gc) {
        const prop = await Property.findById(w.propertyId);
        if (prop) {
          gc = await Chat.create({ propertyId: w.propertyId, type: 'group', members: [prop.ownerId, w._id], name: `${prop.name} Staff` });
          fixes.push(`Created group chat for "${prop.name}"`);
        }
      } else if (!gc.members.some(m => m.toString() === w._id.toString())) {
        gc.members.push(w._id);
        await gc.save();
        fixes.push(`Added ${w.name} to group chat`);
      }
    }
    // Ensure all property owners are in their group chat
    const props = await Property.find({});
    for (const p of props) {
      const gc = await Chat.findOne({ propertyId: p._id, type: 'group' });
      if (gc && !gc.members.some(m => m.toString() === p.ownerId.toString())) {
        gc.members.push(p.ownerId);
        await gc.save();
        fixes.push(`Added owner to group chat for "${p.name}"`);
      }
    }
    console.log(`[REPAIR] ${fixes.length} fixes applied`);
    res.json({ ok: true, fixes });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/status', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.json({ db: dbOk, api: !!process.env.ANTHROPIC_API_KEY, resend: !!resend });
});

app.get('/admin/clear-messages', async (req, res) => {
  try {
    const r = await Message.deleteMany({});
    // Also clear lastMessage on all chats so previews don't show stale text
    await Chat.updateMany({}, { lastMessage: '', lastMessageAt: new Date(0) });
    res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════
//  SOCKET.IO — Real-time chat (rewritten)
// ══════════════════════════════════════

function makeRoomId(id1, id2) {
  return [String(id1), String(id2)].sort().join('_');
}

io.on('connection', (socket) => {
  console.log('[WS] new connection ' + socket.id);

  socket.on('join', ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log('[WS] ' + socket.id + ' joined room ' + roomId);
  });

  socket.on('disconnect', () => {
    console.log('[WS] disconnected ' + socket.id);
  });
});

// ── Start ──
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`[STARTUP] BaanTask running on port ${PORT}`));
});
