import {
  initialize,
  generateEphemeralKeyPair,
  generateSymmetricKey,
  generateNonce,
  encryptSymmetric,
  decryptSymmetric,
  encryptBox,
  decryptBox,
  hash,
  hkdf,
  toBase64,
  fromBase64,
  concat,
  equals,
  computeNonce,
} from './sodium';
import type { KeyPair, RatchetState, RatchetMessage } from '@/types';

const MAX_SKIP = 100;

function createInitialRootKey(
  ourIdentityKeyPair: KeyPair,
  ourEphemeralKeyPair: KeyPair,
  theirIdentityPublicKey: Uint8Array,
  theirEphemeralPublicKey: Uint8Array,
): Uint8Array {
  const dh1 = encryptBox(
    new Uint8Array(0),
    computeNonce(0),
    theirEphemeralPublicKey,
    ourIdentityKeyPair.privateKey,
  ).slice(0, 32);
  const dh2 = encryptBox(
    new Uint8Array(0),
    computeNonce(0),
    theirIdentityPublicKey,
    ourEphemeralKeyPair.privateKey,
  ).slice(0, 32);
  const dh3 = encryptBox(
    new Uint8Array(0),
    computeNonce(0),
    theirEphemeralPublicKey,
    ourEphemeralKeyPair.privateKey,
  ).slice(0, 32);

  return hkdf(new Uint8Array(32), concat(dh1, dh2, dh3), new Uint8Array(0), 32);
}

function deriveChainKeys(rootKey: Uint8Array, dhOutput: Uint8Array): {
  newRootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
} {
  const prk = hkdf(new Uint8Array(32), dhOutput, new Uint8Array(0), 32);
  const newRootKey = hkdf(prk, concat(rootKey, new Uint8Array([0x01])), new Uint8Array(0), 32);
  const sendingChainKey = hkdf(prk, concat(rootKey, new Uint8Array([0x02])), new Uint8Array(0), 32);
  const receivingChainKey = hkdf(prk, concat(rootKey, new Uint8Array([0x03])), new Uint8Array(0), 32);
  return { newRootKey, sendingChainKey, receivingChainKey };
}

function deriveMessageKey(chainKey: Uint8Array): {
  messageKey: Uint8Array;
  nextChainKey: Uint8Array;
} {
  const prk = hkdf(new Uint8Array(32), chainKey, new Uint8Array(0), 32);
  const messageKey = hkdf(prk, concat(chainKey, new Uint8Array([0x01])), new Uint8Array(0), 32);
  const nextChainKey = hkdf(prk, concat(chainKey, new Uint8Array([0x02])), new Uint8Array(0), 32);
  return { messageKey, nextChainKey };
}

export async function initializeRatchetAsSender(
  ourIdentityKeyPair: KeyPair,
  theirIdentityPublicKey: Uint8Array,
): Promise<RatchetState> {
  await initialize();

  const ourEphemeralKeyPair = generateEphemeralKeyPair();
  const rootKey = generateSymmetricKey();

  const state: RatchetState = {
    rootKey,
    sendingChainKey: new Uint8Array(0),
    receivingChainKey: new Uint8Array(0),
    sendingMessageKeys: new Map(),
    receivingMessageKeys: new Map(),
    sendingIndex: 0,
    receivingIndex: 0,
    previousSendingIndex: 0,
    ourEphemeralKeyPair,
    theirEphemeralPublicKey: null,
    ourIdentityKeyPair,
    theirIdentityPublicKey,
  };

  return state;
}

export async function initializeRatchetAsReceiver(
  ourIdentityKeyPair: KeyPair,
  theirIdentityPublicKey: Uint8Array,
  theirEphemeralPublicKey: Uint8Array,
): Promise<RatchetState> {
  await initialize();

  const ourEphemeralKeyPair = generateEphemeralKeyPair();

  const rootKey = createInitialRootKey(
    ourIdentityKeyPair,
    ourEphemeralKeyPair,
    theirIdentityPublicKey,
    theirEphemeralPublicKey,
  );

  const state: RatchetState = {
    rootKey,
    sendingChainKey: new Uint8Array(0),
    receivingChainKey: new Uint8Array(0),
    sendingMessageKeys: new Map(),
    receivingMessageKeys: new Map(),
    sendingIndex: 0,
    receivingIndex: 0,
    previousSendingIndex: 0,
    ourEphemeralKeyPair,
    theirEphemeralPublicKey,
    ourIdentityKeyPair,
    theirIdentityPublicKey,
  };

  return state;
}

export function encryptInitialMessage(
  senderIdentityKeyPair: KeyPair,
  senderEphemeralKeyPair: KeyPair,
  recipientIdentityPublicKey: Uint8Array,
  plaintext: string,
): { ciphertext: string; ephemeralPublicKey: string; messageIndex: number; previousSendingIndex: number } {
  const dhOutput = encryptBox(
    new Uint8Array(0),
    computeNonce(0),
    recipientIdentityPublicKey,
    senderEphemeralKeyPair.privateKey,
  ).slice(0, 32);

  const chainKey = hkdf(new Uint8Array(32), dhOutput, new Uint8Array(0), 32);
  const { messageKey, nextChainKey } = deriveMessageKey(chainKey);

  const { ciphertext, nonce } = encryptSymmetric(
    new TextEncoder().encode(plaintext),
    messageKey,
  );

  return {
    ciphertext: toBase64(concat(nonce, ciphertext)),
    ephemeralPublicKey: toBase64(senderEphemeralKeyPair.publicKey),
    messageIndex: 0,
    previousSendingIndex: 0,
  };
}

export function decryptInitialMessage(
  recipientIdentityKeyPair: KeyPair,
  senderEphemeralPublicKey: Uint8Array,
  ciphertext: string,
): string {
  const dhOutput = encryptBox(
    new Uint8Array(0),
    computeNonce(0),
    senderEphemeralPublicKey,
    recipientIdentityKeyPair.privateKey,
  ).slice(0, 32);

  const chainKey = hkdf(new Uint8Array(32), dhOutput, new Uint8Array(0), 32);
  const { messageKey, nextChainKey } = deriveMessageKey(chainKey);

  const payload = fromBase64(ciphertext);
  const nonce = payload.slice(0, 24);
  const ct = payload.slice(24);

  const plaintext = decryptSymmetric(ct, nonce, messageKey);
  return new TextDecoder().decode(plaintext);
}

export function encryptRatchetMessage(
  state: RatchetState,
  plaintext: string,
): { state: RatchetState; message: RatchetMessage } {
  const newState = { ...state };

  if (newState.sendingChainKey.length === 0) {
    if (!newState.theirEphemeralPublicKey) {
      throw new Error('Cannot encrypt ratchet message: their ephemeral public key not set');
    }

    const dhOutput = encryptBox(
      new Uint8Array(0),
      computeNonce(0),
      newState.theirEphemeralPublicKey,
      newState.ourEphemeralKeyPair.privateKey,
    ).slice(0, 32);

    const derived = deriveChainKeys(newState.rootKey, dhOutput);
    newState.rootKey = derived.newRootKey;
    newState.sendingChainKey = derived.sendingChainKey;
    newState.receivingChainKey = derived.receivingChainKey;

    newState.previousSendingIndex = newState.sendingIndex;
    newState.sendingIndex = 0;

    const newEphemeral = generateEphemeralKeyPair();
    newState.ourEphemeralKeyPair = newEphemeral;
  }

  const { messageKey, nextChainKey } = deriveMessageKey(newState.sendingChainKey);
  newState.sendingChainKey = nextChainKey;

  const { ciphertext, nonce } = encryptSymmetric(
    new TextEncoder().encode(plaintext),
    messageKey,
  );

  const messageIndex = newState.sendingIndex;
  newState.sendingIndex += 1;

  const message: RatchetMessage = {
    header: {
      ourEphemeralPublicKey: toBase64(newState.ourEphemeralKeyPair.publicKey),
      previousSendingIndex: newState.previousSendingIndex,
      messageIndex,
    },
    ciphertext: toBase64(concat(nonce, ciphertext)),
  };

  return { state: newState, message };
}

export function decryptRatchetMessage(
  state: RatchetState,
  message: RatchetMessage,
): { state: RatchetState; plaintext: string } {
  const newState = { ...state };

  if (message.header.ourEphemeralPublicKey) {
    const theirNewEphemeral = fromBase64(message.header.ourEphemeralPublicKey);

    if (!newState.theirEphemeralPublicKey || !equals(theirNewEphemeral, newState.theirEphemeralPublicKey)) {
      if (newState.receivingChainKey.length > 0) {
        for (let i = 0; i < MAX_SKIP; i++) {
          const { messageKey, nextChainKey } = deriveMessageKey(newState.receivingChainKey);
          newState.receivingMessageKeys.set(newState.receivingIndex + i, messageKey);
          newState.receivingChainKey = nextChainKey;
        }
      }

      const dhOutput = encryptBox(
        new Uint8Array(0),
        computeNonce(0),
        theirNewEphemeral,
        newState.ourEphemeralKeyPair.privateKey,
      ).slice(0, 32);

      const derived = deriveChainKeys(newState.rootKey, dhOutput);
      newState.rootKey = derived.newRootKey;
      newState.sendingChainKey = derived.sendingChainKey;
      newState.receivingChainKey = derived.receivingChainKey;

      newState.receivingIndex = 0;
      newState.theirEphemeralPublicKey = theirNewEphemeral;
    }
  }

  const msgIndex = message.header.messageIndex;
  let messageKey: Uint8Array;

  if (newState.receivingMessageKeys.has(msgIndex)) {
    messageKey = newState.receivingMessageKeys.get(msgIndex)!;
    newState.receivingMessageKeys.delete(msgIndex);
  } else {
    if (msgIndex < newState.receivingIndex) {
      throw new Error('Message already decrypted');
    }

    const skip = msgIndex - newState.receivingIndex;
    if (skip > MAX_SKIP) {
      throw new Error(`Too many skipped messages: ${skip}`);
    }

    for (let i = 0; i < skip; i++) {
      const { messageKey: mk, nextChainKey } = deriveMessageKey(newState.receivingChainKey);
      newState.receivingMessageKeys.set(newState.receivingIndex + i, mk);
      newState.receivingChainKey = nextChainKey;
    }

    const { messageKey: mk, nextChainKey } = deriveMessageKey(newState.receivingChainKey);
    messageKey = mk;
    newState.receivingChainKey = nextChainKey;
    newState.receivingIndex = msgIndex + 1;
  }

  const payload = fromBase64(message.ciphertext);
  const nonce = payload.slice(0, 24);
  const ciphertext = payload.slice(24);

  let plaintext: Uint8Array;
  try {
    plaintext = decryptSymmetric(ciphertext, nonce, messageKey);
  } catch {
    throw new Error('Failed to decrypt message: authentication failure');
  }

  return {
    state: newState,
    plaintext: new TextDecoder().decode(plaintext),
  };
}

export function serializeRatchetState(state: RatchetState): string {
  return JSON.stringify({
    rootKey: toBase64(state.rootKey),
    sendingChainKey: toBase64(state.sendingChainKey),
    receivingChainKey: toBase64(state.receivingChainKey),
    sendingMessageKeys: Array.from(state.sendingMessageKeys.entries()).map(
      ([k, v]) => [k, toBase64(v)],
    ),
    receivingMessageKeys: Array.from(state.receivingMessageKeys.entries()).map(
      ([k, v]) => [k, toBase64(v)],
    ),
    sendingIndex: state.sendingIndex,
    receivingIndex: state.receivingIndex,
    previousSendingIndex: state.previousSendingIndex,
    ourEphemeralPublicKey: toBase64(state.ourEphemeralKeyPair.publicKey),
    ourEphemeralPrivateKey: toBase64(state.ourEphemeralKeyPair.privateKey),
    theirEphemeralPublicKey: state.theirEphemeralPublicKey
      ? toBase64(state.theirEphemeralPublicKey)
      : null,
    ourIdentityPublicKey: toBase64(state.ourIdentityKeyPair.publicKey),
    ourIdentityPrivateKey: toBase64(state.ourIdentityKeyPair.privateKey),
    theirIdentityPublicKey: toBase64(state.theirIdentityPublicKey),
  });
}

export function deserializeRatchetState(serialized: string): RatchetState {
  const data = JSON.parse(serialized);
  return {
    rootKey: fromBase64(data.rootKey),
    sendingChainKey: fromBase64(data.sendingChainKey),
    receivingChainKey: fromBase64(data.receivingChainKey),
    sendingMessageKeys: new Map(
      data.sendingMessageKeys.map(([k, v]: [number, string]) => [k, fromBase64(v)]),
    ),
    receivingMessageKeys: new Map(
      data.receivingMessageKeys.map(([k, v]: [number, string]) => [k, fromBase64(v)]),
    ),
    sendingIndex: data.sendingIndex,
    receivingIndex: data.receivingIndex,
    previousSendingIndex: data.previousSendingIndex,
    ourEphemeralKeyPair: {
      publicKey: fromBase64(data.ourEphemeralPublicKey),
      privateKey: fromBase64(data.ourEphemeralPrivateKey),
    },
    theirEphemeralPublicKey: data.theirEphemeralPublicKey
      ? fromBase64(data.theirEphemeralPublicKey)
      : null,
    ourIdentityKeyPair: {
      publicKey: fromBase64(data.ourIdentityPublicKey),
      privateKey: fromBase64(data.ourIdentityPrivateKey),
    },
    theirIdentityPublicKey: fromBase64(data.theirIdentityPublicKey),
  };
}

export function createHandshakeMessage(
  state: RatchetState,
): string {
  return toBase64(
    concat(
      state.ourIdentityKeyPair.publicKey,
      state.ourEphemeralKeyPair.publicKey,
    ),
  );
}

export function parseHandshakeMessage(
  handshakeData: string,
): { identityPublicKey: Uint8Array; ephemeralPublicKey: Uint8Array } {
  const data = fromBase64(handshakeData);
  return {
    identityPublicKey: data.slice(0, 32),
    ephemeralPublicKey: data.slice(32, 64),
  };
}
