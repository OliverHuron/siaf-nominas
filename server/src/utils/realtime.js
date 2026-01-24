// Simple SSE broadcaster for spaces/audit events
const clients = new Set();

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function addClient(res) {
  // Setup headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
  });
}

function broadcast(event, data) {
  for (const res of clients) {
    try {
      sendEvent(res, event, data);
    } catch (e) {
      clients.delete(res);
    }
  }
}

module.exports = { addClient, broadcast };
