const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Bật CORS để trang HTML vẫn gọi được API dù được host ở domain khác
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Phục vụ luôn file public/index.html tại cùng địa chỉ với API,
// để không cần lo domain/CORS: mọi người chỉ cần mở CHUNG 1 link.
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function getRoomState(room) {
  if (!rooms.has(room)) rooms.set(room, { trips: [] });
  return rooms.get(room);
}

app.get('/api/rooms/:room', (req, res) => {
  const room = (req.params.room || 'default-room').toString();
  res.json(getRoomState(room));
});

app.post('/api/rooms/:room', (req, res) => {
  const room = (req.params.room || 'default-room').toString();
  const payload = req.body || {};
  const trips = Array.isArray(payload.trips) ? payload.trips : [];
  const state = { trips };
  rooms.set(room, state);
  res.json(state);
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('Sync server listening on port ' + port);
});
