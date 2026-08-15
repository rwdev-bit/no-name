# Platform Guide

This document describes how the no-name platform actually works: the client, the relay, their wire protocol, and how to run your own relay. It is written against the current code in `apps/`.

## Overview

no-name is an end-to-end encrypted messenger with a simple two-part topology:

```
+----------+      WebSocket + HTTP      +--------+      WebSocket + HTTP      +----------+
|  Client  | <------------------------> | Relay  | <------------------------> |  Client  |
|   (you)  |   encrypted payloads       | (node) |   encrypted payloads       | (peer)   |
+----------+                            +--------+                            +----------+
```

- **Clients** do all cryptography locally. They never send plaintext and never share keys with the relay.
- **Relays** are dumb store-and-forward servers. They hold opaque encrypted payloads for offline recipients, push them when the recipient is online, and serve the built client app. They cannot read messages.

There are no accounts and no server-side identities. A user *is* a public ID derived from their encryption key, and their whole state (keys, contacts, conversations, message history) lives in a single passphrase-encrypted `.chatprofile` file on their own device.

## Components

### Client (`apps/client`)

React + TypeScript SPA built with Vite.

- **Identity** — a `.chatprofile` file containing the X25519 encryption keypair, signing keypair, contacts, conversations, and message history. Private keys are encrypted with a key derived from the passphrase (Argon2id) and the file is sealed with XSalsa20-Poly1305. See `src/crypto/identity.ts`.
- **Public ID** — `base64(blake2b(publicEncryptionKey))` truncated to 32 characters (`derivePublicId` in `src/crypto/identity.ts`). This is what you share to be found on the relay.
- **Encryption** — X3DH-style initial handshake plus a Double Ratchet for forward secrecy (`src/crypto/ratchet.ts`). Both the initial message and subsequent ratchet messages are packed into a JSON envelope before being sent to the relay:

  ```jsonc
  // first message to a contact
  { "v": 1, "type": "initial",
    "ephemeralKey": "<base64>",
    "ciphertext": "<base64>",
    "identityKey": "<base64>" }

  // subsequent messages
  { "v": 1, "type": "ratchet",
    "header": { "ourEphemeralPublicKey": "<base64>",
                "previousSendingIndex": 0,
                "messageIndex": 1 },
    "ciphertext": "<base64>" }
  ```

- **Transport** — one WebSocket connection to the relay, opened after unlock. If the client is loaded from the relay's own HTTP server, it connects to `ws://<host>/ws` by default; a custom relay address can be set in Settings.
- **Offline behavior** — pending messages are fetched automatically when the socket (re)connects; outgoing messages are delivered immediately and the sender receives an `ack`.

### Relay (`apps/relay`)

A plain Node server using the built-in `http` module plus the `ws` WebSocket library. No Express.

- Listens on `HOST` (default `127.0.0.1`) and `PORT` (default `3000`).
- Persists undelivered messages to a JSON file in `DATA_DIR` (default `<cwd>/data`).
- Serves the production client build from `../../apps/client/dist` (relative to the relay's working directory), falling back to `index.html` for SPA routing.

## Relay API

### HTTP

| Method | Path          | Body / Query        | Response                                            |
|--------|---------------|---------------------|-----------------------------------------------------|
| POST   | `/api/send`   | `{ "recipient": "<publicId>", "payload": "<base64>" }` | `200 { "id": "<uuid>", "ok": true }` |
| GET    | `/api/stats`  | —                   | `200 { "activeClients": int, "totalMessages": int, "pendingMessages": int }` |
| GET    | `/`           | —                   | Built client `index.html`                          |

`payload` must match `/^[A-Za-z0-9+/=]+$/` (base64). Requests larger than 256 KB are rejected with `413`.

`POST /api/send` is the anonymous path: the relay records the sender as `"unknown"`. It stores the message and, if the recipient is online, pushes it over WebSocket immediately.

### WebSocket (`/ws`)

The client must authenticate within 10 seconds of connecting. Message types are JSON objects with a `type` field.

| Direction | Message                                                        | Purpose                                   |
|-----------|----------------------------------------------------------------|-------------------------------------------|
| client →  | `{ "type": "auth", "publicId": "<id>" }`                      | Identify yourself.                        |
| relay →   | `{ "type": "auth_ok", "publicId": "<id>" }`                   | Auth accepted; pending messages follow.   |
| relay →   | `{ "type": "message", "id", "sender", "payload", "timestamp" }` | Incoming message (also used for catch-up). |
| client →  | `{ "type": "send", "recipient": "<id>", "payload": "<base64>" }` | Send a message.                           |
| relay →   | `{ "type": "ack", "id": "<uuid>" }`                           | Send accepted and stored.                 |
| client →  | `{ "type": "ping" }`                                          | Keepalive.                                |
| relay →   | `{ "type": "pong" }`                                          | Keepalive reply.                          |

On `auth`, the relay delivers up to 100 pending (undelivered) messages for that public ID and marks them delivered. Anything the relay pushes while the recipient is connected is marked delivered immediately.

## Storage

- Location: `DATA_DIR/messages.json`.
- Format: an array of records `{ id, senderPublicId, recipientPublicId, encryptedPayload, timestamp, delivered, createdAt }`.
- Retention: messages older than 24 hours are purged hourly.
- Durability: writes are debounced (≤1 s) and flushed on shutdown.
- The relay never stores or sees plaintext, keys, or conversation metadata beyond sender/recipient public IDs and timestamps.

## Running a relay

### Development

```bash
npm install
npm run relay          # dev server with watch (listens on 127.0.0.1:3000)
npm run dev            # client dev server (http://127.0.0.1:5173)
```

### Production

```bash
npm install
npm run build          # build the client so the relay can serve it
npm start              # runs the relay; serves the built client
```

### Exposing a relay publicly

By default the relay binds to `127.0.0.1`, which is only reachable from its own host. To make it usable by other people:

- set `HOST=0.0.0.0` (or bind via a reverse proxy), and
- open/forward port `3000` (HTTP and WebSocket share the same port).

For a long-lived instance, use the bundled systemd unit:

```bash
sudo bash deploy/setup.sh
```

It installs and starts a `no-name-relay` service running `apps/relay` with `PORT=3000`, `HOST=127.0.0.1`, and `DATA_DIR=apps/relay/data`. Edit the unit file to change host/bind or the service user.

## Environment variables

| Variable   | Default           | Description                        |
|------------|-------------------|------------------------------------|
| `PORT`     | `3000`            | HTTP + WebSocket port.             |
| `HOST`     | `127.0.0.1`       | Bind address. Use `0.0.0.0` to expose publicly. |
| `DATA_DIR` | `<cwd>/data`      | Where `messages.json` is stored.   |

## Security model and caveats

- **End-to-end encryption** — only the two clients can decrypt messages. The relay is untrusted for confidentiality.
- **Metadata exposure** — the relay *does* learn sender/recipient public IDs, message count, and timestamps. It cannot link a public ID to a real identity, but an operator (or network observer of the relay) sees this metadata.
- **No sender authentication at the relay** — `POST /api/send` allows claiming any recipient; the WebSocket `send` path is only as trustworthy as the connection. Relay operators can spoof, drop, or replay messages. The double ratchet is the client-side defense against forgery, not the relay.
- **No forward secrecy for offline messages** — messages stored at the relay are the payloads already encrypted at send time; the ratchet protects them, but a long-term key compromise combined with stored payloads weakens guarantees (no post-compromise recovery against an attacker holding old ciphertexts + keys).
- **Data retention** — undelivered messages persist up to 24 hours and are stored in plain JSON. Anyone with filesystem access to `DATA_DIR` can read ciphertexts.
- **Not audited** — the crypto has not undergone an independent security review. Do not rely on it for high-stakes communications.
