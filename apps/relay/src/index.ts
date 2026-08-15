import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PACKET_SIZE = 256 * 1024;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

mkdirSync(DATA_DIR, { recursive: true });

interface StoredMessage {
  id: string;
  senderPublicId: string;
  recipientPublicId: string;
  encryptedPayload: string;
  timestamp: number;
  delivered: boolean;
  createdAt: number;
}

const messagesFile = join(DATA_DIR, 'messages.json');

let messages: StoredMessage[] = [];

function loadMessages() {
  try {
    if (existsSync(messagesFile)) {
      const raw = readFileSync(messagesFile, 'utf-8');
      messages = JSON.parse(raw);
    }
  } catch {
    messages = [];
  }
}

function saveMessages() {
  try {
    writeFileSync(messagesFile, JSON.stringify(messages), 'utf-8');
  } catch {}
}

let saveDebounce: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveDebounce) clearTimeout(saveDebounce);
  saveDebounce = setTimeout(saveMessages, 1000);
}

loadMessages();

const clients = new Map<string, Set<WebSocket>>();

const pingInterval = setInterval(() => {
  for (const [id, sockets] of clients) {
    for (const ws of sockets) {
      try { ws.ping(); } catch { sockets.delete(ws); }
    }
    if (sockets.size === 0) clients.delete(id);
  }
}, 30000);

function storeMessage(
  senderPublicId: string,
  recipientPublicId: string,
  encryptedPayload: string,
): string {
  const id = randomUUID();
  const now = Date.now();
  messages.push({
    id,
    senderPublicId,
    recipientPublicId,
    encryptedPayload,
    timestamp: now,
    delivered: false,
    createdAt: now,
  });
  scheduleSave();
  return id;
}

function getPendingMessages(publicId: string): StoredMessage[] {
  return messages.filter(
    (m) => m.recipientPublicId === publicId && !m.delivered,
  ).slice(0, 100);
}

function markDelivered(messageIds: string[]): void {
  if (messageIds.length === 0) return;
  const idSet = new Set(messageIds);
  let changed = false;
  for (const msg of messages) {
    if (idSet.has(msg.id) && !msg.delivered) {
      msg.delivered = true;
      changed = true;
    }
  }
  if (changed) scheduleSave();
}

function cleanupOldMessages(): void {
  const cutoff = Date.now() - MAX_MESSAGE_AGE_MS;
  const oldLen = messages.length;
  messages = messages.filter((m) => m.createdAt >= cutoff);
  if (messages.length < oldLen) scheduleSave();
}

setInterval(cleanupOldMessages, 60 * 60 * 1000);
cleanupOldMessages();

function serveStaticFile(reqPath: string): { body: Buffer; contentType: string } | null {
  const baseDir = join(process.cwd(), '..', '..', 'apps', 'client', 'dist');
  let filePath = join(baseDir, reqPath === '/' ? '/index.html' : reqPath);

  if (!filePath.startsWith(baseDir)) return null;

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return { body: content, contentType };
  } catch {
    try {
      const indexPath = join(baseDir, 'index.html');
      const content = readFileSync(indexPath);
      return { body: content, contentType: 'text/html' };
    } catch {
      return null;
    }
  }
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/send') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > MAX_PACKET_SIZE) {
        res.writeHead(413);
        res.end('Payload too large');
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const { recipient, payload } = JSON.parse(body);
        if (!recipient || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'recipient and payload required' }));
          return;
        }
        if (!/^[A-Za-z0-9+/=]+$/.test(payload)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid payload encoding' }));
          return;
        }

        const messageId = storeMessage('unknown', recipient, payload);

        const recipientSockets = clients.get(recipient);
        if (recipientSockets) {
          for (const ws of recipientSockets) {
            try {
              ws.send(JSON.stringify({
                type: 'message', id: messageId, sender: 'unknown',
                payload, timestamp: Date.now(),
              }));
            } catch {}
          }
          markDelivered([messageId]);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: messageId, ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/stats') {
    const total = messages.length;
    const pending = messages.filter((m) => !m.delivered).length;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ activeClients: clients.size, totalMessages: total, pendingMessages: pending }));
    return;
  }

  const served = serveStaticFile(url.pathname);
  if (served) {
    res.writeHead(200, { 'Content-Type': served.contentType });
    res.end(served.body);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_PACKET_SIZE });

wss.on('connection', (ws: WebSocket) => {
  let publicId: string | null = null;
  let authenticated = false;

  const send = (data: object) => {
    try { ws.send(JSON.stringify(data)); } catch {}
  };

  const timeout = setTimeout(() => {
    if (!authenticated) {
      send({ type: 'error', error: 'authentication timeout' });
      ws.close();
    }
  }, 10000);

  ws.on('message', (raw: Buffer) => {
    let data: any;
    try { data = JSON.parse(raw.toString()); } catch {
      send({ type: 'error', error: 'invalid JSON' });
      return;
    }

    if (data.type === 'auth') {
      if (!data.publicId || typeof data.publicId !== 'string') {
        send({ type: 'error', error: 'publicId required' });
        return;
      }
      publicId = data.publicId;
      authenticated = true;
      clearTimeout(timeout);

      if (!clients.has(publicId)) clients.set(publicId, new Set());
      clients.get(publicId)!.add(ws);

      send({ type: 'auth_ok', publicId });

      const pending = getPendingMessages(publicId);
      if (pending.length > 0) {
        const deliveredIds: string[] = [];
        for (const msg of pending) {
          send({ type: 'message', id: msg.id, sender: msg.senderPublicId, payload: msg.encryptedPayload, timestamp: msg.timestamp });
          deliveredIds.push(msg.id);
        }
        markDelivered(deliveredIds);
      }
      return;
    }

    if (!authenticated) {
      send({ type: 'error', error: 'not authenticated' });
      return;
    }

    if (data.type === 'send') {
      const { recipient, payload } = data;
      if (!recipient || !payload) {
        send({ type: 'error', error: 'recipient and payload required' });
        return;
      }
      if (!/^[A-Za-z0-9+/=]+$/.test(payload)) {
        send({ type: 'error', error: 'invalid payload encoding' });
        return;
      }

      const messageId = storeMessage(publicId!, recipient, payload);

      const recipientSockets = clients.get(recipient);
      if (recipientSockets) {
        for (const clientWs of recipientSockets) {
          try {
            clientWs.send(JSON.stringify({ type: 'message', id: messageId, sender: publicId, payload, timestamp: Date.now() }));
          } catch {}
        }
        markDelivered([messageId]);
      }

      send({ type: 'ack', id: messageId });
      return;
    }

    if (data.type === 'ping') {
      send({ type: 'pong' });
    }
  });

  ws.on('close', () => {
    if (publicId && clients.has(publicId)) {
      const sockets = clients.get(publicId)!;
      sockets.delete(ws);
      if (sockets.size === 0) clients.delete(publicId);
    }
    clearTimeout(timeout);
  });

  ws.on('error', () => {});
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[relay] Listening on ${HOST}:${PORT}`);
  console.log(`[relay] Data directory: ${DATA_DIR}`);
});

function shutdown() {
  console.log('[relay] Shutting down...');
  saveMessages();
  clearInterval(pingInterval);
  for (const [, sockets] of clients) {
    for (const ws of sockets) ws.close();
  }
  wss.close();
  httpServer.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
