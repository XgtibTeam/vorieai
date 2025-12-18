// server.js
// Main express server. Put frontend files in /public
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// --- JSONBin (hard-coded as you requested) ---
const JSONBIN_KEY = "$2a$10$VgGdKhHNGyYIibY1.OQxl.B6kODOFjQwK7asUOTKl67UrFanxbtKe";
const JSONBIN_ID  = "6937c4e0d0ea881f401c5109";
global.JSONBIN_CONF = { key: JSONBIN_KEY, bin: JSONBIN_ID };

// Modules
const { processMessage, seedTemplates } = require('./brain/brain');
const { getHistory, appendHistory, resetHistory, exportHistory, purgeOld } = require('./memory/jsonbin');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// seed templates
seedTemplates();

// POST /chat
app.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const sid = sessionId || `s_${Date.now()}`;

    // load history snapshot
    const history = await getHistory();

    // process message
    const { userMsg, aiMsg } = await processMessage(history, sid, message);

    // persist
    await appendHistory(userMsg);
    await appendHistory(aiMsg);

    res.json({ ok:true, sessionId: sid, ai: aiMsg, user: userMsg });
  } catch (err) {
    console.error('CHAT ERROR', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /history?sessionId=...
app.get('/history', async (req, res) => {
  try {
    const sid = req.query.sessionId;
    const history = await getHistory();
    if (!sid) return res.json({ history: history.slice(-1000) });
    const filtered = history.filter(x => x.sessionId === sid);
    return res.json({ session: filtered });
  } catch (err) {
    console.error('HISTORY ERROR', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Admin endpoints
app.get('/admin/cleanup', async (req,res) => {
  try { await resetHistory(); return res.json({ done:true }); }
  catch(e){ return res.status(500).json({ error: e.message }); }
});

app.get('/admin/export', async (req,res) => {
  try { const data = await exportHistory(); return res.json(data); }
  catch(e){ return res.status(500).json({ error: e.message }); }
});

app.post('/admin/purge', async (req,res) => {
  try {
    const keepLast = parseInt(req.body.keepLast || '1000', 10);
    await purgeOld(keepLast);
    return res.json({ ok:true, keepLast });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('AI backend listening on', PORT));
  
