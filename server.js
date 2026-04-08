require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store messages in memory
let messages = [];

app.get('/messages', (req, res) => {
  res.json(messages);
});

app.post('/send', async (req, res) => {
  const { text, sender } = req.body;
  const fromLang = sender === 'owner' ? 'Russian' : 'Thai';
  const toLang = sender === 'owner' ? 'Thai' : 'Russian';

  // Save original message
  messages.push({ sender, text, translated: null, time: new Date().toLocaleTimeString() });

  // Translate using Claude
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Translate this from ${fromLang} to ${toLang}. Reply with ONLY the translation, nothing else: "${text}"`
    }]
  });

  const translated = response.content[0].text;
  messages[messages.length - 1].translated = translated;

  res.json({ success: true, translated });
});

app.listen(3000, () => {
  console.log('BaanTask running at http://localhost:3000');
});
