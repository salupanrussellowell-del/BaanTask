require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LANGUAGES = ['Russian', 'Thai', 'English', 'Filipino', 'Myanmar', 'Chinese'];

// In-memory message store
// Each message: { id, sender, senderLang, text, translations: { "Russian": "...", ... }, time }
let messages = [];

console.log('[STARTUP] BaanTask server starting...');
console.log('[STARTUP] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('[STARTUP] ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0);
console.log('[STARTUP] ANTHROPIC_API_KEY prefix:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 7) + '...' : 'MISSING');
console.log('[STARTUP] Supported languages:', LANGUAGES.join(', '));

// Translate a single message to a single target language
async function translateOne(text, fromLang, toLang) {
  console.log(`[TRANSLATE START] "${text.substring(0, 40)}" | ${fromLang} -> ${toLang}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[TRANSLATE FAIL] No ANTHROPIC_API_KEY in environment!');
    return null;
  }

  try {
    console.log('[TRANSLATE] Calling Anthropic API...');
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a translator. Translate the following text from ${fromLang} to ${toLang}. Output ONLY the translated text, nothing else. No quotes, no labels, no explanations.\n\nText to translate: ${text}`
      }]
    });

    console.log('[TRANSLATE] API responded. Stop reason:', response.stop_reason);
    console.log('[TRANSLATE] Content blocks:', response.content.length);
    console.log('[TRANSLATE] Raw response:', JSON.stringify(response.content));

    const translated = response.content[0].text.trim();

    console.log(`[TRANSLATE OK] Input (${fromLang}): "${text}"`);
    console.log(`[TRANSLATE OK] Output (${toLang}): "${translated}"`);

    // Sanity check: if the "translation" is identical to the input, something went wrong
    if (translated === text) {
      console.error('[TRANSLATE WARN] Output identical to input! API may have echoed the text back.');
    }

    return translated;
  } catch (e) {
    console.error(`[TRANSLATE FAIL] ${fromLang}->${toLang}: ${e.message}`);
    console.error(`[TRANSLATE FAIL] Error type: ${e.constructor.name}`);
    console.error(`[TRANSLATE FAIL] Full:`, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    return null;
  }
}

// Clear all messages and bad cached translations - visit /clear to reset
app.get('/clear', (req, res) => {
  const count = messages.length;
  messages = [];
  console.log(`[CLEAR] Wiped ${count} messages`);
  res.json({ cleared: count });
});

// Health check - visit /status to verify API key works
app.get('/status', async (req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  console.log('[STATUS] Checking API key...');
  if (!hasKey) {
    console.error('[STATUS] ANTHROPIC_API_KEY is NOT set!');
    return res.json({ ok: false, error: 'ANTHROPIC_API_KEY not set' });
  }
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }]
    });
    console.log('[STATUS] API call succeeded:', response.content[0].text);
    res.json({ ok: true, apiWorks: true, messages: messages.length });
  } catch (e) {
    console.error('[STATUS] API call FAILED:', e.message);
    res.json({ ok: false, error: e.message });
  }
});

// Get messages - translate on the fly for the requesting user's language
app.get('/messages', async (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.json([]);

  console.log(`[GET /messages] User requesting in ${lang}, ${messages.length} messages total`);

  // Translate any messages that need it for this language
  for (const m of messages) {
    if (m.senderLang === lang) continue; // Same language, no translation needed

    // Scrub bad cached translations from old buggy fallback (e.g. "[Russian] original text")
    if (m.translations[lang] && m.translations[lang].startsWith('[')) {
      console.log(`[SCRUB] Removing bad cached translation for msg ${m.id} lang ${lang}: "${m.translations[lang].substring(0, 40)}"`);
      delete m.translations[lang];
    }

    if (m.translations[lang]) continue;  // Already translated and cached

    console.log(`[GET /messages] Need translation for msg ${m.id} (${m.senderLang} -> ${lang})`);
    const translated = await translateOne(m.text, m.senderLang, lang);
    if (translated) {
      m.translations[lang] = translated;
    }
  }

  const result = messages.map(m => ({
    id: m.id,
    sender: m.sender,
    senderLang: m.senderLang,
    text: m.text,
    translation: m.senderLang === lang ? null : (m.translations[lang] || null),
    time: m.time
  }));

  console.log(`[GET /messages] Returning ${result.length} messages for ${lang}`);
  res.json(result);
});

// Send a message - just store it, no translation here
app.post('/send', (req, res) => {
  const { text, sender, lang } = req.body;
  if (!text || !sender || !lang) {
    console.log('[POST /send] Missing fields:', { text: !!text, sender: !!sender, lang: !!lang });
    return res.status(400).json({ error: 'Missing text, sender, or lang' });
  }

  const msg = {
    id: Date.now(),
    sender,
    senderLang: lang,
    text,
    translations: {},
    time: new Date().toISOString()
  };

  messages.push(msg);
  console.log(`[POST /send] Stored message ${msg.id} from ${sender} (${lang}): "${text.substring(0, 50)}"`);
  console.log(`[POST /send] Total messages now: ${messages.length}`);

  res.json({ success: true, id: msg.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[STARTUP] BaanTask running on port ${PORT}`);
});
