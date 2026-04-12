require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LANGUAGES = ['Russian', 'Thai', 'English', 'Filipino', 'Myanmar', 'Chinese'];

console.log('[STARTUP] BaanTask server starting...');
console.log('[STARTUP] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('[STARTUP] MONGODB_URI set:', !!process.env.MONGODB_URI);

// ── Mongoose schemas ──

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  pinHash: { type: String, default: '' },
  contact: { type: String, default: '' },
  lang: { type: String, required: true },
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
const Room = mongoose.model('Room', roomSchema);
const Message = mongoose.model('Message', messageSchema);

// ── Connect to MongoDB ──

let dbConnected = false;

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set! App will not work.');
    return;
  }
  try {
    const url = new URL(uri);
    if (!url.pathname || url.pathname === '/' || url.pathname === '') {
      url.pathname = '/baantask';
      uri = url.toString();
      console.log('[DB] Added database name to URI: /baantask');
    }
    console.log(`[DB] Connecting to database: ${url.pathname.substring(1) || '(none)'}`);
  } catch (e) {
    console.warn('[DB] Could not parse URI to check db name:', e.message);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    dbConnected = true;
    console.log('[DB] Connected to MongoDB Atlas');
    const users = await User.countDocuments();
    const rooms = await Room.countDocuments();
    const msgs = await Message.countDocuments();
    console.log(`[DB] ${users} users, ${rooms} rooms, ${msgs} messages`);
  } catch (e) {
    console.error('[DB] Connection failed:', e.message);
  }
}

// ── Helpers ──

function genRoomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
}

// ── Translate ──

async function translateOne(text, fromLang, toLang) {
  console.log(`[TRANSLATE] "${text.substring(0, 40)}" | ${fromLang} -> ${toLang}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[TRANSLATE FAIL] No ANTHROPIC_API_KEY');
    return null;
  }
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a translator. Translate the following text from ${fromLang} to ${toLang}. Output ONLY the translated text, nothing else. No quotes, no labels, no explanations.\n\nText to translate: ${text}`
      }]
    });
    const translated = response.content[0].text.trim();
    console.log(`[TRANSLATE OK] ${toLang}: "${translated.substring(0, 60)}"`);
    return translated;
  } catch (e) {
    console.error(`[TRANSLATE FAIL] ${fromLang}->${toLang}: ${e.message}`);
    return null;
  }
}

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
        if (contact) existing.contact = contact;
        await existing.save();
        console.log(`[LOGIN] Migrated old user: ${name}`);
        return res.json({ ok: true, user: { name: existing.name, lang: existing.lang } });
      }

      const match = await bcrypt.compare(pin, existing.pinHash);
      if (!match) {
        console.log(`[LOGIN] Wrong PIN for ${name}`);
        return res.json({ ok: false, error: 'Wrong PIN' });
      }
      existing.lang = lang;
      if (contact) existing.contact = contact;
      await existing.save();
      console.log(`[LOGIN] Welcome back: ${name}`);
      return res.json({ ok: true, user: { name: existing.name, lang: existing.lang } });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const user = await User.create({ name, pinHash, contact: contact || '', lang });
    console.log(`[LOGIN] New user created: ${name}`);
    res.json({ ok: true, user: { name: user.name, lang: user.lang }, isNew: true });
  } catch (e) {
    console.error('[LOGIN ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'Login failed: ' + e.message });
  }
});

// ── Room Routes ──

// Create a new room
app.post('/api/rooms/create', async (req, res) => {
  const { name, userName } = req.body;
  if (!name || !userName) {
    return res.status(400).json({ ok: false, error: 'Room name and user name required' });
  }

  try {
    let code;
    // Ensure unique code
    for (let i = 0; i < 10; i++) {
      code = genRoomCode();
      const exists = await Room.findOne({ code });
      if (!exists) break;
    }

    const room = await Room.create({ name, code, createdBy: userName, members: [userName] });
    console.log(`[ROOM] Created "${name}" code=${code} by ${userName}`);
    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) {
    console.error('[ROOM CREATE ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'Failed to create room' });
  }
});

// Join a room by invite code
app.post('/api/rooms/join', async (req, res) => {
  const { code, userName } = req.body;
  if (!code || !userName) {
    return res.status(400).json({ ok: false, error: 'Code and user name required' });
  }

  try {
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      console.log(`[ROOM] Invalid code: ${code}`);
      return res.json({ ok: false, error: 'Invalid invite code' });
    }

    if (!room.members.includes(userName)) {
      room.members.push(userName);
      await room.save();
      console.log(`[ROOM] ${userName} joined "${room.name}" (${room.code})`);
    } else {
      console.log(`[ROOM] ${userName} already in "${room.name}" (${room.code})`);
    }

    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) {
    console.error('[ROOM JOIN ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'Failed to join room' });
  }
});

// Get room info
app.get('/api/rooms/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.json({ ok: false, error: 'Room not found' });
    res.json({ ok: true, room: { name: room.name, code: room.code, members: room.members } });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Failed to get room' });
  }
});

// ── Message Routes (scoped to room) ──

app.get('/api/messages', async (req, res) => {
  const { lang, room } = req.query;
  if (!lang || !room) return res.json([]);

  try {
    const msgs = await Message.find({ roomCode: room }).sort({ createdAt: 1 }).lean();
    console.log(`[GET /api/messages] ${msgs.length} msgs for room=${room} lang=${lang}`);

    for (const m of msgs) {
      if (m.senderLang === lang) continue;
      const translations = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      if (translations[lang]) continue;

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
      const translations = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      const reactions = m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {});

      let replyPreview = null;
      if (m.replyTo) {
        const orig = byId[m.replyTo.toString()];
        if (orig) {
          const ot = orig.translations instanceof Map ? Object.fromEntries(orig.translations) : (orig.translations || {});
          replyPreview = { sender: orig.sender, text: orig.senderLang === lang ? orig.text : (ot[lang] || orig.text) };
        }
      }

      return {
        id: m._id.toString(),
        sender: m.sender,
        senderLang: m.senderLang,
        text: m.text,
        translation: m.senderLang === lang ? null : (translations[lang] || null),
        reactions,
        replyTo: replyPreview,
        time: m.createdAt
      };
    });

    res.json(result);
  } catch (e) {
    console.error('[GET /api/messages ERROR]', e.message);
    res.json([]);
  }
});

app.post('/api/send', async (req, res) => {
  const { text, sender, lang, roomCode, replyTo } = req.body;
  console.log(`[SEND] Received:`, JSON.stringify({ text: text?.substring(0, 50), sender, lang, roomCode, replyTo: !!replyTo }));

  if (!text || !sender || !lang || !roomCode) {
    return res.status(400).json({ ok: false, error: 'Missing text, sender, lang, or roomCode' });
  }
  if (!dbConnected) {
    return res.status(503).json({ ok: false, error: 'Database not connected' });
  }

  try {
    const msg = await Message.create({ roomCode, sender, senderLang: lang, text, replyTo: replyTo || null });
    console.log(`[SEND OK] id=${msg._id} room=${roomCode} from ${sender}: "${text.substring(0, 50)}"`);
    res.json({ ok: true, id: msg._id.toString() });
  } catch (e) {
    console.error('[SEND ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'Failed to save message' });
  }
});

app.post('/api/react', async (req, res) => {
  const { messageId, emoji, userName } = req.body;
  if (!messageId || !emoji || !userName) {
    return res.status(400).json({ error: 'Missing messageId, emoji, or userName' });
  }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const users = msg.reactions.get(emoji) || [];
    const idx = users.indexOf(userName);
    if (idx >= 0) {
      users.splice(idx, 1);
      if (users.length === 0) msg.reactions.delete(emoji);
      else msg.reactions.set(emoji, users);
    } else {
      users.push(userName);
      msg.reactions.set(emoji, users);
    }
    await msg.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('[REACT ERROR]', e.message);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// Health check
app.get('/status', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let apiOk = false;
  if (hasKey) {
    try {
      await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Say ok' }] });
      apiOk = true;
    } catch (e) { /* */ }
  }
  const users = dbOk ? await User.countDocuments() : 0;
  const rooms = dbOk ? await Room.countDocuments() : 0;
  const msgs = dbOk ? await Message.countDocuments() : 0;
  res.json({ db: dbOk, api: apiOk, users, rooms, messages: msgs });
});

// ── Start ──

connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[STARTUP] BaanTask running on port ${PORT}`);
  });
});
