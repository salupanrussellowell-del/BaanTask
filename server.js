require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  senderLang: { type: String, required: true },
  text: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Message' },
  translations: { type: Map, of: String, default: {} },
  reactions: { type: Map, of: [String], default: {} },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// ── Connect to MongoDB ──

let dbConnected = false;

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set! App will not work.');
    return;
  }

  // Ensure the URI has the database name 'baantask'
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
    const msgs = await Message.countDocuments();
    console.log(`[DB] ${users} users, ${msgs} messages`);
  } catch (e) {
    console.error('[DB] Connection failed:', e.message);
  }
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
    console.log(`[LOGIN] User lookup result: ${existing ? 'found (has pinHash: ' + !!existing.pinHash + ')' : 'not found'}`);

    if (existing) {
      // Old user from before PIN system — migrate them
      if (!existing.pinHash) {
        console.log(`[LOGIN] Migrating old user ${name} — setting their PIN`);
        existing.pinHash = await bcrypt.hash(pin, 10);
        existing.lang = lang;
        if (contact) existing.contact = contact;
        await existing.save();
        return res.json({ ok: true, user: { name: existing.name, lang: existing.lang } });
      }

      // User exists with PIN — check it
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

    // New user — create account
    const pinHash = await bcrypt.hash(pin, 10);
    const user = await User.create({ name, pinHash, contact: contact || '', lang });
    console.log(`[LOGIN] New user created: ${name}`);
    res.json({ ok: true, user: { name: user.name, lang: user.lang }, isNew: true });
  } catch (e) {
    console.error('[LOGIN ERROR]', e.message);
    console.error('[LOGIN ERROR] Stack:', e.stack);
    res.status(500).json({ ok: false, error: 'Login failed: ' + e.message });
  }
});

// ── Message Routes ──

app.get('/api/messages', async (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.json([]);

  try {
    const msgs = await Message.find().sort({ createdAt: 1 }).lean();
    console.log(`[GET /api/messages] ${msgs.length} msgs for ${lang}`);

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
  const { text, sender, lang, replyTo } = req.body;
  console.log(`[SEND] Received:`, JSON.stringify({ text: text?.substring(0, 50), sender, lang, replyTo: !!replyTo }));

  if (!text || !sender || !lang) {
    return res.status(400).json({ ok: false, error: 'Missing text, sender, or lang' });
  }
  if (!dbConnected) {
    return res.status(503).json({ ok: false, error: 'Database not connected' });
  }

  try {
    const msg = await Message.create({ sender, senderLang: lang, text, replyTo: replyTo || null });
    console.log(`[SEND OK] id=${msg._id} from ${sender} (${lang}): "${text.substring(0, 50)}"`);
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
    console.log(`[REACT] ${userName} ${idx >= 0 ? 'removed' : 'added'} ${emoji} on ${messageId}`);
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
  const msgs = dbOk ? await Message.countDocuments() : 0;
  res.json({ db: dbOk, api: apiOk, users, messages: msgs });
});

// ── Start ──

connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[STARTUP] BaanTask running on port ${PORT}`);
  });
});
