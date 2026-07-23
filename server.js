const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { Redis } = require('@upstash/redis');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

function roomKey(room) {
  return `room:${room}`;
}

// --- cấu hình gửi mail ---
const NOTIFY_TO = process.env.NOTIFY_TO || 'tamvatri098@gmail.com';

function sendNewTripEmail(trip) {
  const subject = `Lịch hẹn mới: ${trip.title}`;
  const text = [
    `Người thêm: ${trip.addedBy || 'Không rõ'}`,
    `Ngày: ${trip.date}${trip.time ? ' ' + trip.time : ''}`,
    trip.place ? `Địa điểm: ${trip.place}` : '',
    trip.note ? `Ghi chú: ${trip.note}` : ''
  ].filter(Boolean).join('\n');

  resend.emails.send({
    from: 'onboarding@resend.dev',
    to: NOTIFY_TO,
    subject,
    text
  }).catch(err => console.error('Gửi mail thất bại:', err.message));
}

app.get('/api/rooms/:room', async (req, res) => {
  const room = (req.params.room || 'default-room').toString();
  try {
    const state = await redis.get(roomKey(room));
    res.json(state || { trips: [] });
  } catch (e) {
    res.status(500).json({ trips: [], error: 'db_error' });
  }
});

app.post('/api/rooms/:room', async (req, res) => {
  const room = (req.params.room || 'default-room').toString();
  const payload = req.body || {};
  const trips = Array.isArray(payload.trips) ? payload.trips : [];
  const state = { trips };

  try {
    const oldState = await redis.get(roomKey(room));
    const oldTrips = (oldState && Array.isArray(oldState.trips)) ? oldState.trips : [];
    const oldIds = new Set(oldTrips.map(t => t.id));
    const newlyAdded = trips.filter(t => !oldIds.has(t.id));

    await redis.set(roomKey(room), state);
    res.json(state);

    newlyAdded.forEach(sendNewTripEmail);
  } catch (e) {
    res.status(500).json({ error: 'db_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('Sync server listening on port ' + port);
});
