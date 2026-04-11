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

// ── Startup checks ──

console.log('[STARTUP] BaanTask server starting...');
console.log('[STARTUP] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('[STARTUP] MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('[STARTUP] TWILIO_ACCOUNT_SID set:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('[STARTUP] TWILIO_AUTH_TOKEN set:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('[STARTUP] TWILIO_PHONE_NUMBER set:', !!process.env.TWILIO_PHONE_NUMBER);
console.log('[STARTUP] RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

// ── Twilio + Resend (optional) ──

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('[STARTUP] Twilio client initialized');
} else {
  console.warn('[STARTUP] Twilio not configured — SMS OTP will be logged to console only');
}

let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  console.log('[STARTUP] Resend client initialized');
} else {
  console.warn('[STARTUP] Resend not configured — email OTP will be logged to console only');
}

// ── Mongoose schemas ──

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  lang: { type: String, required: true },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  contact: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
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
const OTP = mongoose.model('OTP', otpSchema);
const Message = mongoose.model('Message', messageSchema);

// ── Connect to MongoDB ──

let dbConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set! Messages will not persist.');
    return;
  }
  try {
    await mongoose.connect(uri);
    dbConnected = true;
    console.log('[DB] Connected to MongoDB Atlas');
    const count = await Message.countDocuments();
    console.log(`[DB] ${count} messages in database`);
  } catch (e) {
    console.error('[DB] Connection failed:', e.message);
  }
}

// ── Helpers ──

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function isPhone(s) { return /^\+?[\d\s\-()]{7,}$/.test(s.replace(/\s/g, '')); }
function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

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

// ── OTP Routes ──

// Step 1: Send OTP code
app.post('/api/send-otp', async (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ error: 'Contact required' });

  const code = genOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  console.log(`[OTP] Generating code for ${contact}: ${code} (expires ${expiresAt.toISOString()})`);

  try {
    await OTP.create({ contact, code, expiresAt });
  } catch (e) {
    console.error('[OTP] Failed to save to DB:', e.message);
    // Continue anyway — we'll log the code
  }

  // Send via Twilio SMS
  if (isPhone(contact) && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const cleaned = contact.replace(/[\s\-()]/g, '');
      const toNumber = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
      await twilioClient.messages.create({
        body: `BaanTask verification code: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toNumber
      });
      console.log(`[OTP] SMS sent to ${toNumber}`);
      return res.json({ ok: true, method: 'sms' });
    } catch (e) {
      console.error('[OTP] Twilio SMS failed:', e.message);
      // Fall through to console log
    }
  }

  // Send via Resend email
  if (isEmail(contact) && resendClient) {
    try {
      await resendClient.emails.send({
        from: 'BaanTask <onboarding@resend.dev>',
        to: [contact],
        subject: 'BaanTask Verification Code',
        text: `Your BaanTask verification code is: ${code}\n\nThis code expires in 10 minutes.`
      });
      console.log(`[OTP] Email sent to ${contact}`);
      return res.json({ ok: true, method: 'email' });
    } catch (e) {
      console.error('[OTP] Resend email failed:', e.message);
      // Fall through to console log
    }
  }

  // Fallback: log to console (for dev / when services not configured)
  console.log(`[OTP] *** CODE FOR ${contact}: ${code} *** (no delivery service available)`);
  res.json({ ok: true, method: 'console' });
});

// Step 2: Verify OTP code
app.post('/api/verify-otp', async (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) return res.status(400).json({ error: 'Contact and code required' });

  console.log(`[OTP VERIFY] ${contact} entered code: ${code}`);

  try {
    const otp = await OTP.findOne({
      contact,
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: -1 });

    if (!otp) {
      console.log(`[OTP VERIFY] Invalid or expired code for ${contact}`);
      return res.json({ ok: false, error: 'Invalid or expired code' });
    }

    otp.used = true;
    await otp.save();
    console.log(`[OTP VERIFY] Code verified for ${contact}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[OTP VERIFY ERROR]', e.message);
    res.json({ ok: false, error: 'Verification failed' });
  }
});

// Step 3: Complete login after OTP verification
app.post('/api/login', async (req, res) => {
  const { name, contact, lang } = req.body;
  if (!name || !lang) return res.status(400).json({ error: 'Name and language required' });

  console.log(`[LOGIN] ${name} (${lang}) contact: ${contact || 'none'}`);
  try {
    // Find user by contact (returning user) or create new
    let user = contact ? await User.findOne({ contact }) : null;
    if (user) {
      user.name = name;
      user.lang = lang;
      user.verified = true;
      await user.save();
      console.log(`[LOGIN] Returning user recognised by contact: ${contact}`);
    } else {
      user = await User.create({ name, contact: contact || '', lang, verified: !!contact });
      console.log(`[LOGIN] Created new user: ${name}`);
    }
    res.json({ ok: true, user: { name: user.name, contact: user.contact, lang: user.lang } });
  } catch (e) {
    console.error('[LOGIN ERROR]', e.message);
    res.json({ ok: true, user: { name, contact, lang } });
  }
});

// ── Message Routes ──

// Get messages with translations
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

      console.log(`[GET /api/messages] Translating msg ${m._id} (${m.senderLang} -> ${lang})`);
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

// Send a message
app.post('/api/send', async (req, res) => {
  const { text, sender, lang, replyTo } = req.body;
  console.log(`[SEND] Received:`, JSON.stringify({ text: text?.substring(0, 50), sender, lang, replyTo: !!replyTo }));

  if (!text || !sender || !lang) {
    console.error('[SEND] Missing fields:', { text: !!text, sender: !!sender, lang: !!lang });
    return res.status(400).json({ ok: false, error: 'Missing text, sender, or lang' });
  }

  if (!dbConnected) {
    console.error('[SEND] MongoDB not connected! Cannot save message.');
    return res.status(503).json({ ok: false, error: 'Database not connected' });
  }

  try {
    const msg = await Message.create({
      sender,
      senderLang: lang,
      text,
      replyTo: replyTo || null
    });
    console.log(`[SEND OK] id=${msg._id} from ${sender} (${lang}): "${text.substring(0, 50)}"`);
    res.json({ ok: true, id: msg._id.toString() });
  } catch (e) {
    console.error('[SEND ERROR]', e.message);
    console.error('[SEND ERROR] Stack:', e.stack);
    res.status(500).json({ ok: false, error: 'Failed to save message: ' + e.message });
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
  const hasTwilio = !!twilioClient;
  const hasResend = !!resendClient;
  let apiOk = false;
  if (hasKey) {
    try {
      await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Say ok' }] });
      apiOk = true;
    } catch (e) { /* */ }
  }
  const msgCount = dbOk ? await Message.countDocuments() : 0;
  res.json({ db: dbOk, api: apiOk, twilio: hasTwilio, resend: hasResend, messages: msgCount });
});

// ── Start ──

connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[STARTUP] BaanTask running on port ${PORT}`);
  });
});
