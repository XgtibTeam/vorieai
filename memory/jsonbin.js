// memory/jsonbin.js
const axios = require('axios');
const BASE = 'https://api.jsonbin.io/v3/b';

async function getHistory(){
  try{
    const { key, bin } = global.JSONBIN_CONF;
    const url = `${BASE}/${bin}/latest`;
    const r = await axios.get(url, { headers: { 'X-Master-Key': key } });
    if (r.data && r.data.record && Array.isArray(r.data.record.history)) return r.data.record.history;
    if (r.data && r.data.record) {
      // if record holds sessions or other structure, try to extract
      if (Array.isArray(r.data.record.sessions)) return r.data.record.sessions;
      if (Array.isArray(r.data.record.history)) return r.data.record.history;
    }
    return [];
  }catch(e){
    console.warn('JSONBin read failed', e.message);
    return [];
  }
}

async function saveAllHistory(arr){
  try{
    const { key, bin } = global.JSONBIN_CONF;
    const url = `${BASE}/${bin}`;
    await axios.put(url, { history: arr }, { headers: { 'Content-Type':'application/json', 'X-Master-Key': key } });
    return true;
  }catch(e){ console.error('saveAllHistory fail', e.message); return false; }
}

async function appendHistory(obj){
  const hist = await getHistory();
  hist.push(obj);
  return await saveAllHistory(hist);
}

async function resetHistory(){ return await saveAllHistory([]); }
async function exportHistory(){ return await getHistory(); }
async function purgeOld(keepLast=1000){
  const h = await getHistory();
  const newh = h.slice(-keepLast);
  return await saveAllHistory(newh);
}

module.exports = { getHistory, saveAllHistory, appendHistory, resetHistory, exportHistory, purgeOld };

