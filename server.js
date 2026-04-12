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

const LANGUAGES = ['Russian', 'Thai', 'English', 'Filipino', 'Myanmar', 'Chinese'];

console.log('[STARTUP] BaanTask server starting...');
console.log('[STARTUP] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('[STARTUP] MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('[STARTUP] RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

// ── Resend email client ──

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('[STARTUP] Resend email client ready');
} else {
  console.warn('[STARTUP] RESEND_API_KEY not set — OTP codes will be logged to console only');
}

// ── Mongoose schemas ──

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  pinHash: { type: String, default: '' },
  contact: { type: String, default: '' },
  lang: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  contact: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  members: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  senderLang: { type: String, required: true },
  text: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Message' },
  translations: { type: Map, of: String, default: {} },
  reactions: { type: Map, of: [String], default: {} },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Room = mongoose.model('Room', roomSchema);
const Message = mongoose.model('Message', messageSchema);

// ── Connect to MongoDB ──

let dbConnected = false;

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) { console.error('[DB] MONGODB_URI not set!'); return; }
  try {
    const url = new URL(uri);
    if (!url.pathname || url.pathname === '/' || url.pathname === '') {
      url.pathname = '/baantask';
      uri = url.toString();
    }
    console.log(`[DB] Connecting to: ${url.pathname.substring(1) || '(none)'}`);
  } catch (e) { /* */ }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000 });
    dbConnected = true;
    console.log('[DB] Connected to MongoDB Atlas');
  } catch (e) {
    console.error('[DB] Connection failed:', e.message);
  }
}

// ── Helpers ──

function genRoomCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── Translate ──

async function translateOne(text, fromLang, toLang) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: `You are a translator. Translate the following text from ${fromLang} to ${toLang}. Output ONLY the translated text, nothing else. No quotes, no labels, no explanations.\n\nText to translate: ${text}` }]
    });
    return response.content[0].text.trim();
  } catch (e) {
    console.error(`[TRANSLATE FAIL] ${fromLang}->${toLang}: ${e.message}`);
    return null;
  }
}

// ── OTP Routes ──

app.post('/api/send-otp', async (req, res) => {
  const { contact, name } = req.body;
  if (!contact) return res.status(400).json({ ok: false, error: 'Email required' });

  const code = genOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  console.log(`[OTP] Generating for ${contact}: ${code}`);

  try {
    await OTP.create({ contact, otp: code, expiresAt });
  } catch (e) {
    console.error('[OTP] DB save failed:', e.message);
  }

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'BaanTask <onboarding@resend.dev>',
        to: [contact],
        subject: 'Your BaanTask verification code',
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:400px;margin:0 auto;padding:24px;">
          <h2 style="color:#075e54;margin:0 0 16px;">BaanTask</h2>
          <p style="color:#333;margin:0 0 8px;">Hi ${name || 'there'},</p>
          <p style="color:#555;margin:0 0 20px;">Here is your verification code:</p>
          <div style="background:#f0f4f0;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#075e54;">${code}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0;">This code expires in 10 minutes.</p>
        </div>`
      });
      if (error) {
        console.error('[OTP] ========================================');
        console.error('[OTP] Resend FAILED for:', contact);
        console.error('[OTP] Error:', JSON.stringify(error));
        console.error('[OTP] ========================================');
        // Fall through to console fallback
      } else {
        console.log(`[OTP] Email sent to ${contact} via Resend (id: ${data?.id})`);
        return res.json({ ok: true, method: 'email' });
      }
    } catch (e) {
      console.error('[OTP] ========================================');
      console.error('[OTP] Resend exception for:', contact);
      console.error('[OTP] Message:', e.message);
      console.error('[OTP] Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
      console.error('[OTP] ========================================');
      // Fall through to console fallback
    }
  }

  // Fallback: log OTP clearly in console
  console.log('[OTP] ========================================');
  console.log(`[OTP CODE] ====> ${code} <==== for ${contact}`);
  console.log('[OTP] ========================================');
  res.json({ ok: true, method: 'console' });
});

app.post('/api/verify-otp', async (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp) return res.status(400).json({ ok: false, error: 'Email and code required' });

  console.log(`[OTP VERIFY] ${contact} entered: ${otp}`);

  try {
    const record = await OTP.findOne({
      contact,
      otp,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!record) {
      console.log(`[OTP VERIFY] Invalid or expired for ${contact}`);
      return res.json({ ok: false, error: 'Invalid or expired code' });
    }

    // Clean up used OTPs
    await OTP.deleteMany({ contact });
    console.log(`[OTP VERIFY] Verified ${contact}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[OTP VERIFY ERROR]', e.message);
    res.json({ ok: false, error: 'Verification failed' });
  }
});

// ── PIN Login ──

app.post('/api/login', async (req, res) => {
  const { name, pin, contact, lang } = req.body;
  if (!name || !pin || !lang) {
    return res.status(400).json({ ok: false, error: 'Name, PIN, and language required' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ ok: false, error: 'PIN must be exactly 4 digits' });
  }

  console.log(`[LOGIN] Attempt: ${name} (${lang})`);

  try {
    const existing = await User.findOne({ name });

    if (existing) {
      if (!existing.pinHash) {
        existing.pinHash = await bcrypt.hash(pin, 10);
        existing.lang = lang;
        if (contact) { existing.contact = contact; existing.emailVerified = true; }
        await existing.save();
        return res.json({ ok: true, user: { name: existing.name, lang: existing.lang } });
      }

      const match = await bcrypt.compare(pin, existing.pinHash);
      if (!match) return res.json({ ok: false, error: 'Wrong PIN' });

      existing.lang = lang;
      if (contact) { existing.contact = contact; existing.emailVerified = true; }
      await existing.save();
      return res.json({ ok: true, user: { name: existing.name, lang: existing.lang } });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const user = await User.create({ name, pinHash, contact: contact || '', lang, emailVerified: !!contact });
    console.log(`[LOGIN] New user: ${name}`);
    res.json({ ok: true, user: { name: user.name, lang: user.lang }, isNew: true });
  } catch (e) {
    console.error('[LOGIN ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'Login failed: ' + e.message });
  }
});

// ── Room Routes ──

app.post('/api/rooms/create', async (req, res) => {
  const { name, userName } = req.body;
  if (!name || !userName) return res.status(400).json({ ok: false, error: 'Room name and user name required' });
  try {
    let code;
    for (let i = 0; i < 10; i++) { code = genRoomCode(); if (!(await Room.findOne({ code }))) break; }
    const room = await Room.create({ name, code, createdBy: userName, members: [userName] });
    console.log(`[ROOM] Created "${name}" code=${code} by ${userName}`);
    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) { res.status(500).json({ ok: false, error: 'Failed to create room' }); }
});

app.post('/api/rooms/join', async (req, res) => {
  const { code, userName } = req.body;
  if (!code || !userName) return res.status(400).json({ ok: false, error: 'Code and user name required' });
  try {
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.json({ ok: false, error: 'Invalid invite code' });
    if (!room.members.includes(userName)) { room.members.push(userName); await room.save(); }
    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) { res.status(500).json({ ok: false, error: 'Failed to join room' }); }
});

app.get('/api/rooms/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.json({ ok: false, error: 'Room not found' });
    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) { res.status(500).json({ ok: false, error: 'Failed to get room' }); }
});

// ── Message Routes ──

app.get('/api/messages', async (req, res) => {
  const { lang, room } = req.query;
  if (!lang || !room) return res.json([]);
  try {
    const msgs = await Message.find({ roomCode: room }).sort({ createdAt: 1 }).lean();
    for (const m of msgs) {
      if (m.senderLang === lang) continue;
      const t = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      if (t[lang]) continue;
      const translated = await translateOne(m.text, m.senderLang, lang);
      if (translated) {
        await Message.updateOne({ _id: m._id }, { $set: { [`translations.${lang}`]: translated } });
        if (m.translations instanceof Map) m.translations.set(lang, translated);
        else { m.translations = m.translations || {}; m.translations[lang] = translated; }
      }
    }
    const byId = {};
    msgs.forEach(m => { byId[m._id.toString()] = m; });
    const result = msgs.map(m => {
      const tr = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      const re = m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {});
      let rp = null;
      if (m.replyTo) { const o = byId[m.replyTo.toString()]; if (o) { const ot = o.translations instanceof Map ? Object.fromEntries(o.translations) : (o.translations || {}); rp = { sender: o.sender, text: o.senderLang === lang ? o.text : (ot[lang] || o.text) }; } }
      return { id: m._id.toString(), sender: m.sender, senderLang: m.senderLang, text: m.text, translation: m.senderLang === lang ? null : (tr[lang] || null), reactions: re, replyTo: rp, time: m.createdAt };
    });
    res.json(result);
  } catch (e) { console.error('[MESSAGES ERROR]', e.message); res.json([]); }
});

app.post('/api/send', async (req, res) => {
  const { text, sender, lang, roomCode, replyTo } = req.body;
  if (!text || !sender || !lang || !roomCode) return res.status(400).json({ ok: false, error: 'Missing fields' });
  if (!dbConnected) return res.status(503).json({ ok: false, error: 'Database not connected' });
  try {
    const msg = await Message.create({ roomCode, sender, senderLang: lang, text, replyTo: replyTo || null });
    console.log(`[SEND] ${sender} in ${roomCode}: "${text.substring(0, 50)}"`);
    res.json({ ok: true, id: msg._id.toString() });
  } catch (e) { res.status(500).json({ ok: false, error: 'Failed to save' }); }
});

app.post('/api/react', async (req, res) => {
  const { messageId, emoji, userName } = req.body;
  if (!messageId || !emoji || !userName) return res.status(400).json({ error: 'Missing fields' });
  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const users = msg.reactions.get(emoji) || [];
    const idx = users.indexOf(userName);
    if (idx >= 0) { users.splice(idx, 1); if (!users.length) msg.reactions.delete(emoji); else msg.reactions.set(emoji, users); }
    else { users.push(userName); msg.reactions.set(emoji, users); }
    await msg.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/delete', async (req, res) => {
  const { messageId, userName } = req.body;
  if (!messageId || !userName) return res.status(400).json({ ok: false, error: 'Missing fields' });
  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ ok: false, error: 'Not found' });
    if (msg.sender !== userName) return res.status(403).json({ ok: false, error: 'Not your message' });
    await Message.deleteOne({ _id: messageId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: 'Failed' }); }
});

app.get('/admin/clear-messages', async (req, res) => {
  try { const r = await Message.deleteMany({}); res.json({ ok: true, deleted: r.deletedCount }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/status', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const hasResend = !!resend;
  let apiOk = false;
  if (hasKey) { try { await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] }); apiOk = true; } catch (e) { /* */ } }
  res.json({ db: dbOk, api: apiOk, resend: hasResend });
});

connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`[STARTUP] BaanTask running on port ${PORT}`));
});
