const WebSocket = require('ws');
const https = require('https');  // Add this line to import https


// Create a new WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store clients and their associated rooms
const clients = new Map();
const rooms = new Map();

function keepAlive() {
  setInterval(() => {
      https.get(`https://web-socket-fuwr.onrender.com`, (res) => {
          res.on('data', () => {
            // console.log(res);
              console.log('Ping successful to keep server awake');
          });
      }).on('error', (err) => {
          console.error('Ping error:', err);
      });
  }, 10000); // Ping every 10 minutes
  // }, 10 * 60 * 1000); // Ping every 10 minutes
}

// Start self-pinging
keepAlive();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substr(2, 9);
  clients.set(id, ws);
  console.log(`Client connected: ${id}`);

  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    console.log(message);
    console.log(parsedMessage);
    // Handle room joining
    if (parsedMessage.roomId) {
      if (!rooms.has(parsedMessage.roomId)) {
        rooms.set(parsedMessage.roomId, new Set());
      }
      rooms.get(parsedMessage.roomId).add(id);
      console.log(`Client ${id} joined room ${parsedMessage.roomId}`);
    }

    // Broadcast message to clients in the same room
    broadcast(id, parsedMessage);
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${id}`);
    clients.delete(id);
    // Remove client from all rooms
    for (const [roomId, clientSet] of rooms.entries()) {
      clientSet.delete(id);
      if (clientSet.size === 0) {
        rooms.delete(roomId); // Remove empty rooms
      }
    }
  });
});

// Broadcast message to clients in the same room
function broadcast(senderId, message) {
  const roomId = message.roomId; // Get the room ID from the message
  if (roomId && rooms.has(roomId)) {
    const clientSet = rooms.get(roomId);
    clientSet.forEach((clientId) => {
      if (clientId !== senderId) {
        const client = clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      }
    });
  }
}

console.log('WebSocket signaling server is running on ws://localhost:8080');
