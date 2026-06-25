const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if(filePath.endsWith('sw.js')){
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
    if(filePath.endsWith('manifest.json')){
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// ===== Firebase Admin =====
initializeApp({
  credential: cert({
    type: "service_account",
    project_id: "student-behavior-1",
    private_key_id: "60bf3dfb13ad5ced860a1f2d608de02dfd18f9a9",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDH/W9vWiUyqsUk\n86oeZbMk8jxfOVacEcohVf/kpFO7Xtqvt/jOpSx33m2Ix/iVtpPk20+tQfV0P80f\nQDzNQFeUaewcKQ2Sd7MX1qvuvOQs90am+4f4y8oqm424ZopJeSMh39frLQCLQU64\nXMTfVSn4D1uA60Ilf2XE/2JX06cvd8SB4o1WcqVbmtVb5zFUsSbTmJIqXTUkcbKq\nWBTfiuMooW/H6Wlz/XG0YWFyddySBAAeeFIIAItKZ4xnKnMucuZ/7LoOlKth3ubY\nyiWUBUt/Az7JAu8/eCNe9Tsy6it2HLTpolgXcaee1V1hn5336+OlK074FLTBPaEp\nk1E3JAJjAgMBAAECggEAJt29iN3zibe/bZF/N74bBSygh/8MMnOQnU7p1sUK0si5\n5llyHLLkA/2xutnmGS5s6pamkuzVJ3z4v8CLsHX3L0wwiz59OUBTCWh6bIDANW7v\nB6etgrAUP5iQf8xJxsKojb5DZ5yM1QNhqZm51w9lgyR064aNCd2K6TCaq6fh/2rG\nzgaie3E/xTjQKrIuvoJeT1G9Gx7TlDcD54owMXcP1qG6rnNI7qFgqoGMj99aXRQV\nNiQhfrv75yUvHvtJI+hVKn0sz/WTbGsdr4yUzBR3pKlntolqexPPo1zEGTQWPv4e\nQtd7Re2yV/5/k2r6CoByQJW96DYyaaYG5rFFEy68qQKBgQDkFrsAYXvZqS4EHNec\n+KF0t1y3QyeR4o+xsJSms6HLBYLNIFfGRKqryPXoDclmp5qQjgwsQwud40AuD9QL\ns6oq7wksOG/2PqLWBudKRNR+gWauBbU6LJQrBjaUVjC2tKTkbvUMQ9ZMCk32vReS\nZDv0mj+G2E4sJhbyQ0lnLVVUiwKBgQDgdnY4gaMlfjbhzFrVhN8buwKxaP6mpLDt\njubCzu8l86xFkbYM6Tq6WDH1Hl3Yi90ncR7NFQOq8M4PZW3l+Sle4TXlgj1IJaVT\naCqV6W41/8BQufRfsLpJ/Ps+QPz2REJ0X4HeUz2bcXVFBH8XdM3ltzxpcgLrs2R/\ntgkyo7HMiQKBgQDLVHQaD80vqUCrS+buOTr9aGSPvp7szzLX7ZlmzmXiLaSAJl/5\nEMew4jJNTtUG3UzNpsO1RYN6mdZh+ZxHXj/JjFP6BsnQk9/nujm/nIJtz/9wDQiU\ntp7Th/Np4zgD+B+ywDNVXrgQC3ObDNCRoSdNk6AkHnn5o277Qv6RqvkRpwKBgQCG\nZyh+yVExQBQIvF6ff4JAjogcRuxESFUQygJvH42fQfsjZQ6HSJg7wFeZmGdFJOp1\nlYyF7FFX5/zaxzc4/yrAf0XQeV3Md445FSR6w12Uw+EZ9V7YdW/2oZ6nNi7CHzlT\niWSwBVPcYeGARCL9npkzNbbcxMHu9Gn29r8nLVFnUQKBgQDKse2PRr1rjU+HIlGR\nlRPeVaryTelabhXzEj19XX74G9OnJyBOQkckweES4sW6LvwPNfcV1xLIpibWwv6E\neJ4JL2r9W7GNybXZlfh0AvOplWIK1B+n0VJF95KvtBlaM8kmnvzaxIVasSaqLzL5\n+FkwsgOlwgWyTj39qEsBvBjpkg==\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@student-behavior-1.iam.gserviceaccount.com",
    client_id: "107255281096154648740",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40student-behavior-1.iam.gserviceaccount.com"
  })
});

const db = getFirestore();
const DOC_REF = db.collection('data').doc('p63');

// cache ใน memory
let memDB = null;

async function readDB() {
  if (memDB) return memDB;
  try {
    const doc = await DOC_REF.get();
    memDB = doc.exists ? doc.data() : { students: {}, requests: {} };
  } catch(e) {
    console.log('Firestore read error:', e.message);
    memDB = { students: {}, requests: {} };
  }
  return memDB;
}

async function writeDB(data) {
  memDB = data;
  try {
    await DOC_REF.set(data);
  } catch(e) {
    console.log('Firestore write error:', e.message);
  }
}

// ===== Routes =====
app.get('/api/data', async (req, res) => {
  res.json(await readDB());
});

app.post('/api/data', async (req, res) => {
  await writeDB(req.body);
  res.json({ ok: true });
});

app.post('/api/students', async (req, res) => {
  const db2 = await readDB();
  const { id, student } = req.body;
  db2.students[id] = student;
  await writeDB(db2);
  res.json({ ok: true });
});

app.patch('/api/students/:id', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  db2.students[sid] = { ...db2.students[sid], ...req.body };
  await writeDB(db2);
  res.json({ ok: true });
});

app.post('/api/students/:id/logs', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  if (!db2.students[sid].logs) db2.students[sid].logs = [];
  db2.students[sid].logs.unshift(req.body);
  await writeDB(db2);
  res.json({ ok: true });
});

app.post('/api/students/:id/redeemLogs', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  if (!db2.students[sid].redeemLogs) db2.students[sid].redeemLogs = [];
  db2.students[sid].redeemLogs.unshift(req.body);
  await writeDB(db2);
  res.json({ ok: true });
});

app.patch('/api/students/:id/hw/:subject', async (req, res) => {
  const db2 = await readDB();
  const { id, subject } = req.params;
  if (!db2.students[id]) return res.status(404).json({ error: 'not found' });
  if (!db2.students[id].hw) db2.students[id].hw = {};
  db2.students[id].hw[subject] = req.body;
  await writeDB(db2);
  res.json({ ok: true });
});

app.delete('/api/students/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.students[req.params.id]) return res.status(404).json({ error: 'not found' });
  delete db2.students[req.params.id];
  await writeDB(db2);
  res.json({ ok: true });
});

app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/requests', async (req, res) => {
  const db2 = await readDB();
  if (!db2.requests) db2.requests = {};
  const id = 'req' + Date.now();
  db2.requests[id] = req.body;
  await writeDB(db2);
  res.json({ ok: true, id });
});

app.patch('/api/requests/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.requests[req.params.id]) return res.status(404).json({ error: 'not found' });
  db2.requests[req.params.id] = { ...db2.requests[req.params.id], ...req.body };
  await writeDB(db2);
  res.json({ ok: true });
});

// ===== Start =====
const listener = app.listen(process.env.PORT || 3000, async () => {
  console.log('Server running on port ' + listener.address().port);
  console.log('Loading from Firestore...');
  await readDB();
  console.log('Ready! Students:', Object.keys(memDB.students || {}).length);

  // Ping ตัวเองทุก 14 นาที
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000);
  setInterval(() => {
    try {
      const url = new URL(SELF_URL + '/api/ping');
      const lib = url.protocol === 'https:' ? https : http;
      lib.get(url.toString(), r => console.log('Ping:', r.statusCode)).on('error', e => console.log('Ping err:', e.message));
    } catch(e) {}
  }, 14 * 60 * 1000);
});

// เพิ่ม routes สำหรับ messages, redeemRequests, settings
app.patch('/api/messages/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.messages) db2.messages = {};
  db2.messages[req.params.id] = { ...db2.messages[req.params.id], ...req.body };
  await writeDB(db2);
  res.json({ ok: true });
});

app.delete('/api/messages/:id', async (req, res) => {
  const db2 = await readDB();
  if (db2.messages) delete db2.messages[req.params.id];
  await writeDB(db2);
  res.json({ ok: true });
});

app.patch('/api/redeemRequests/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.redeemRequests) db2.redeemRequests = {};
  db2.redeemRequests[req.params.id] = { ...db2.redeemRequests[req.params.id], ...req.body };
  await writeDB(db2);
  res.json({ ok: true });
});

app.patch('/api/settings/:key', async (req, res) => {
  const db2 = await readDB();
  if (!db2.settings) db2.settings = {};
  db2.settings[req.params.key] = req.body[req.params.key] || req.body;
  await writeDB(db2);
  res.json({ ok: true });
});

app.patch('/api/markread/:studentId', async (req, res) => {
  const db2 = await readDB();
  const { from } = req.body;
  Object.values(db2.messages || {}).forEach(m => {
    if (m.studentId === req.params.studentId && m.from === from) m.read = true;
  });
  await writeDB(db2);
  res.json({ ok: true });
});
