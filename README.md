# no-name

An anonymous, end-to-end encrypted messenger. Messages are encrypted client-side with a Signal-style X3DH + Double Ratchet protocol and relayed through a lightweight store-and-forward server, so the relay never sees plaintext.

## Features

- **End-to-end encryption** — X3DH key agreement and Double Ratchet forward secrecy (via libsodium)
- **Pseudonymous by design** — no accounts; your identity is just a public ID derived from your key pair, and the relay can't tie it to a person
- **Self-contained identity** — your keys, contacts, conversations, and messages live in a single passphrase-protected `.chatprofile` file, so nothing is stored server-side
- **Store-and-forward relay** — offline messages are held briefly and delivered on reconnect
- **Theming & settings** — dark/light/system themes, accent colors, font options, and auto-lock
- **No accounts, no server-side state** — only your public ID, derived from your encryption key

## Architecture

```
apps/
  client/   React + TypeScript + Vite SPA (crypto, UI, identity file)
  relay/    Node + WebSocket relay server (store-and-forward)
deploy/
  setup.sh  One-shot systemd deployment script
docs/
  platform.md    How the platform works: protocol, API, running a relay
```

- **Client** (`apps/client`) — Vite + React SPA. All encryption happens here. An identity is a `.chatprofile` file encrypted with a passphrase-derived key; the public ID is a hash of your public encryption key.
- **Relay** (`apps/relay`) — store-and-forward server. It accepts encrypted payloads over WebSocket/HTTP, stores them briefly in `apps/relay/data/messages.json` (24h retention), and pushes them to the recipient when online. It never holds plaintext. It also serves the built client.
- **Deploy** (`deploy/`) — script for hosting a relay as a systemd service.

## Prerequisites

- Node.js 18+ and npm

## Getting started (development)

```bash
# install workspace dependencies
npm install

# run the relay (WebSocket + HTTP server on :3000)
npm run relay

# run the client dev server (http://127.0.0.1:5173)
npm run dev
```

Two clients can talk through the relay at `ws://127.0.0.1:3000/ws`. Point the client at the relay address in Settings.

## Production build

```bash
npm run build      # builds the client into apps/client/dist
npm start          # starts the relay, which also serves the built client
```

## Running your own relay

See [docs/platform.md](docs/platform.md) for the full protocol and API reference, or run the automated systemd setup:

```bash
sudo bash deploy/setup.sh
```

This installs and starts a `no-name-relay` service serving the app and WebSocket relay on `:3000`.

## Security notes

- Encryption uses `libsodium` (X25519, XSalsa20-Poly1305, Argon2id for passphrase derivation) plus a Double Ratchet for forward secrecy.
- The relay only stores opaque, encrypted payloads for at most 24 hours and has no access to keys or plaintext.
- Your identity file contains your private keys — guard it. Losing it loses your identity.
- **Audit status:** this project has not been independently audited. Do not trust it for high-stakes communications yet.

## License

[MIT](LICENSE)
