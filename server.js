require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
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
  name: { type: String, required: true },
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

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set! Messages will not persist.');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB Atlas');
    const count = await Message.countDocuments();
    console.log(`[DB] ${count} messages in database`);
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

// ── API Routes ──

// Register / login user
app.post('/api/login', async (req, res) => {
  const { name, contact, lang } = req.body;
  if (!name || !lang) return res.status(400).json({ error: 'Name and language required' });

  console.log(`[LOGIN] ${name} (${lang}) contact: ${contact || 'none'}`);
  try {
    let user = await User.findOne({ name });
    if (user) {
      user.contact = contact || user.contact;
      user.lang = lang;
      await user.save();
      console.log(`[LOGIN] Updated existing user: ${name}`);
    } else {
      user = await User.create({ name, contact: contact || '', lang });
      console.log(`[LOGIN] Created new user: ${name}`);
    }
    res.json({ ok: true, user: { name: user.name, contact: user.contact, lang: user.lang } });
  } catch (e) {
    console.error('[LOGIN ERROR]', e.message);
    res.json({ ok: true, user: { name, contact, lang } });
  }
});

// Get messages with translations for a language
app.get('/api/messages', async (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.json([]);

  try {
    const msgs = await Message.find().sort({ createdAt: 1 }).lean();
    console.log(`[GET /api/messages] ${msgs.length} msgs for ${lang}`);

    // Translate any that need it
    for (const m of msgs) {
      if (m.senderLang === lang) continue;
      const translations = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      if (translations[lang]) continue;

      console.log(`[GET /api/messages] Translating msg ${m._id} (${m.senderLang} -> ${lang})`);
      const translated = await translateOne(m.text, m.senderLang, lang);
      if (translated) {
        await Message.updateOne({ _id: m._id }, { $set: { [`translations.${lang}`]: translated } });
        m.translations = m.translations || {};
        if (m.translations instanceof Map) m.translations.set(lang, translated);
        else m.translations[lang] = translated;
      }
    }

    // Build reply lookup
    const byId = {};
    msgs.forEach(m => { byId[m._id.toString()] = m; });

    const result = msgs.map(m => {
      const translations = m.translations instanceof Map ? Object.fromEntries(m.translations) : (m.translations || {});
      const reactions = m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {});

      // Build reply preview
      let replyPreview = null;
      if (m.replyTo) {
        const orig = byId[m.replyTo.toString()];
        if (orig) {
          const origTranslations = orig.translations instanceof Map ? Object.fromEntries(orig.translations) : (orig.translations || {});
          replyPreview = {
            sender: orig.sender,
            text: orig.senderLang === lang ? orig.text : (origTranslations[lang] || orig.text)
          };
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

// Send a message
app.post('/api/send', async (req, res) => {
  const { text, sender, lang, replyTo } = req.body;
  if (!text || !sender || !lang) {
    return res.status(400).json({ error: 'Missing text, sender, or lang' });
  }

  try {
    const msg = await Message.create({
      sender,
      senderLang: lang,
      text,
      replyTo: replyTo || null
    });
    console.log(`[SEND] ${sender} (${lang}): "${text.substring(0, 50)}" id=${msg._id}${replyTo ? ' replyTo=' + replyTo : ''}`);
    res.json({ ok: true, id: msg._id.toString() });
  } catch (e) {
    console.error('[SEND ERROR]', e.message);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Add/toggle reaction
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
  const msgCount = dbOk ? await Message.countDocuments() : 0;
  res.json({ db: dbOk, api: apiOk, messages: msgCount });
});

// ── Start ──

connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[STARTUP] BaanTask running on port ${PORT}`);
  });
});
