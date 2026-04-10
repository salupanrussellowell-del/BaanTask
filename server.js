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
console.log('[STARTUP] Supported languages:', LANGUAGES.join(', '));

// Translate a single message to a single target language
async function translateOne(text, fromLang, toLang) {
  console.log(`[TRANSLATE] "${text.substring(0, 40)}..." from ${fromLang} to ${toLang}`);
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Translate from ${fromLang} to ${toLang}. Reply with ONLY the translation, nothing else.\n\n${text}`
      }]
    });
    const result = response.content[0].text.trim();
    console.log(`[TRANSLATE] Result (${toLang}): "${result.substring(0, 60)}"`);
    return result;
  } catch (e) {
    console.error(`[TRANSLATE ERROR] ${fromLang}->${toLang}:`, e.message);
    return null;
  }
}

// Get messages - translate on the fly for the requesting user's language
app.get('/messages', async (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.json([]);

  console.log(`[GET /messages] User requesting in ${lang}, ${messages.length} messages total`);

  // Translate any messages that need it for this language
  for (const m of messages) {
    if (m.senderLang === lang) continue; // Same language, no translation needed
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
