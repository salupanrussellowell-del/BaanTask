require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'messages.json');
const LANGUAGES = ['Russian', 'Thai', 'English', 'Filipino', 'Myanmar', 'Chinese'];

function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading messages:', e.message);
  }
  return [];
}

function saveMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

let messages = loadMessages();

// Get messages with translations for a specific language
app.get('/messages', (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.json([]);

  const result = messages.map(m => ({
    id: m.id,
    sender: m.sender,
    senderLang: m.senderLang,
    text: m.text,
    translation: m.senderLang === lang ? null : (m.translations[lang] || null),
    time: m.time
  }));
  res.json(result);
});

// Send a message and translate to all other languages
app.post('/send', async (req, res) => {
  const { text, sender, lang } = req.body;
  if (!text || !sender || !lang) {
    return res.status(400).json({ error: 'Missing text, sender, or lang' });
  }

  const targetLangs = LANGUAGES.filter(l => l !== lang);

  const msg = {
    id: Date.now(),
    sender,
    senderLang: lang,
    text,
    translations: {},
    time: new Date().toISOString()
  };

  // Translate to all other languages in one API call
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Translate the following message from ${lang} into each of these languages: ${targetLangs.join(', ')}.
Reply with ONLY a JSON object where keys are language names and values are translations. No markdown, no explanation.

Message: "${text}"`
      }]
    });

    let raw = response.content[0].text.trim();
    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
    const parsed = JSON.parse(raw);
    msg.translations = parsed;
  } catch (e) {
    console.error('Translation error:', e.message);
    console.error('Raw API response:', e.raw || 'N/A');
  }

  messages.push(msg);
  saveMessages(messages);
  res.json({ success: true, id: msg.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaanTask running on port ${PORT}`);
});
