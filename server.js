const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { Redis } = require('@upstash/redis');

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
    await redis.set(roomKey(room), state);
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: 'db_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('Sync server listening on port ' + port);
});
