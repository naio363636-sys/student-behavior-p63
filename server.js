const express = require('express');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

// เขียนทับทั้งฐานข้อมูล - ใช้เฉพาะตอน import/restore ข้อมูลทั้งชุด หรือเป็น fallback เท่านั้น
// เพราะส่งข้อมูล "ทั้งหมด" ไป Firestore ทุกครั้ง กิน bandwidth เยอะถ้าเรียกบ่อย
async function writeDB(data) {
  memDB = data;
  try {
    await DOC_REF.set(data);
  } catch(e) {
    console.log('Firestore write error:', e.message);
  }
}

// อัปเดตเฉพาะ field ที่เปลี่ยน (เช่น 'students.123') แทนการเขียนทับทั้งก้อน
// ลด bandwidth ไป Firestore ได้มาก เพราะส่งแค่ส่วนที่เปลี่ยนจริง ไม่ใช่ข้อมูลนักเรียนทั้งห้อง
async function updateFields(updates) {
  // sync เข้า memDB ให้ตรงกันทันที (ไม่ต้องรอ network)
  Object.entries(updates).forEach(([fieldPath, value]) => {
    const keys = fieldPath.split('.');
    let obj = memDB;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  });
  try {
    await DOC_REF.update(updates);
  } catch(e) {
    console.log('Firestore update error, fallback to full write:', e.message);
    // เผื่อเอกสารยังไม่เคยถูกสร้าง หรือ field path มีปัญหา ให้ fallback เขียนทั้งก้อนแทน (สำรองความถูกต้องของข้อมูล)
    await writeDB(memDB);
  }
}

// ลบ field เฉพาะจุด (เช่น 'students.123') ออกจาก Firestore โดยไม่กระทบ field อื่น
async function deleteField(fieldPath) {
  const keys = fieldPath.split('.');
  let obj = memDB;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) { obj = null; break; }
    obj = obj[keys[i]];
  }
  if (obj) delete obj[keys[keys.length - 1]];
  try {
    await DOC_REF.update({ [fieldPath]: FieldValue.delete() });
  } catch(e) {
    console.log('Firestore delete error, fallback to full write:', e.message);
    await writeDB(memDB);
  }
}

// ===== Routes =====
app.get('/api/data', async (req, res) => {
  res.json(await readDB());
});

// endpoint นี้เขียนทับทั้งฐานข้อมูล - มีไว้สำหรับ import/restore ข้อมูลทั้งชุดเท่านั้น ไม่ควรเรียกบ่อย
app.post('/api/data', async (req, res) => {
  await writeDB(req.body);
  res.json({ ok: true });
});

app.post('/api/students', async (req, res) => {
  await readDB();
  const { id, student } = req.body;
  await updateFields({ [`students.${id}`]: student });
  res.json({ ok: true });
});

app.patch('/api/students/:id', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  const merged = { ...db2.students[sid], ...req.body };
  await updateFields({ [`students.${sid}`]: merged });
  res.json({ ok: true });
});

app.post('/api/students/:id/logs', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  const logs = [req.body, ...(db2.students[sid].logs || [])];
  const merged = { ...db2.students[sid], logs };
  await updateFields({ [`students.${sid}`]: merged });
  res.json({ ok: true });
});

app.post('/api/students/:id/redeemLogs', async (req, res) => {
  const db2 = await readDB();
  const sid = req.params.id;
  if (!db2.students[sid]) return res.status(404).json({ error: 'not found' });
  const redeemLogs = [req.body, ...(db2.students[sid].redeemLogs || [])];
  const merged = { ...db2.students[sid], redeemLogs };
  await updateFields({ [`students.${sid}`]: merged });
  res.json({ ok: true });
});

app.patch('/api/students/:id/hw/:subject', async (req, res) => {
  const db2 = await readDB();
  const { id, subject } = req.params;
  if (!db2.students[id]) return res.status(404).json({ error: 'not found' });
  const hw = { ...(db2.students[id].hw || {}), [subject]: req.body };
  const merged = { ...db2.students[id], hw };
  await updateFields({ [`students.${id}`]: merged });
  res.json({ ok: true });
});

app.delete('/api/students/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.students[req.params.id]) return res.status(404).json({ error: 'not found' });
  await deleteField(`students.${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/requests', async (req, res) => {
  await readDB();
  const id = 'req' + Date.now();
  await updateFields({ [`requests.${id}`]: req.body });
  res.json({ ok: true, id });
});

app.patch('/api/requests/:id', async (req, res) => {
  const db2 = await readDB();
  if (!db2.requests[req.params.id]) return res.status(404).json({ error: 'not found' });
  const merged = { ...db2.requests[req.params.id], ...req.body };
  await updateFields({ [`requests.${req.params.id}`]: merged });
  res.json({ ok: true });
});

// ===== Start =====
const listener = app.listen(process.env.PORT || 3000, async () => {
  console.log('Server running on port ' + listener.address().port);
  console.log('Loading from Firestore...');
  await readDB();
  console.log('Ready! Students:', Object.keys(memDB.students || {}).length);

  // หมายเหตุ: ลบ self-ping (outbound) ออกแล้ว เพื่อลดแบนด์วิดท์
  // Render เปลี่ยนนโยบายให้นับ "Service-Initiated" traffic เข้าแบนด์วิดท์ด้วย (ตั้งแต่ ต.ค. 2025)
  // ใช้บริการภายนอกอย่าง UptimeRobot/cron-job.org ส่ง ping เข้ามาแทน (นับเป็น HTTP Responses ซึ่งเล็กกว่ามาก)
  // ตั้งค่าให้ ping มาที่ /api/ping ทุก 10-14 นาที เพื่อกัน service sleep (free tier sleep หลังไม่มี traffic 15 นาที)
});

// เพิ่ม routes สำหรับ messages, redeemRequests, settings
app.patch('/api/messages/:id', async (req, res) => {
  const db2 = await readDB();
  const merged = { ...(db2.messages && db2.messages[req.params.id]), ...req.body };
  await updateFields({ [`messages.${req.params.id}`]: merged });
  res.json({ ok: true });
});

app.delete('/api/messages/:id', async (req, res) => {
  const db2 = await readDB();
  if (db2.messages && db2.messages[req.params.id]) {
    await deleteField(`messages.${req.params.id}`);
  }
  res.json({ ok: true });
});

app.patch('/api/redeemRequests/:id', async (req, res) => {
  const db2 = await readDB();
  const merged = { ...(db2.redeemRequests && db2.redeemRequests[req.params.id]), ...req.body };
  await updateFields({ [`redeemRequests.${req.params.id}`]: merged });
  res.json({ ok: true });
});

app.patch('/api/settings/:key', async (req, res) => {
  const key = req.params.key;
  const value = req.body[key] !== undefined ? req.body[key] : req.body;
  await readDB();
  await updateFields({ [`settings.${key}`]: value });
  res.json({ ok: true });
});

app.patch('/api/markread/:studentId', async (req, res) => {
  const db2 = await readDB();
  const { from } = req.body;
  const updates = {};
  Object.entries(db2.messages || {}).forEach(([mid, m]) => {
    if (m.studentId === req.params.studentId && m.from === from && !m.read) {
      updates[`messages.${mid}`] = { ...m, read: true };
    }
  });
  if (Object.keys(updates).length > 0) {
    await updateFields(updates);
  }
  res.json({ ok: true });
});
