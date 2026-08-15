import sodium from 'libsodium-wrappers-sumo';
import type { KeyPair } from '@/types';

let ready = false;

export async function initialize(): Promise<void> {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

export function generateEncryptionKeyPair(): KeyPair {
  return sodium.crypto_box_keypair();
}

export function generateSigningKeyPair(): KeyPair {
  return sodium.crypto_sign_keypair();
}

export function generateEphemeralKeyPair(): KeyPair {
  return sodium.crypto_box_keypair();
}

export function generateSymmetricKey(): Uint8Array {
  return sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
}

export function generateNonce(): Uint8Array {
  return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
}

export function generateRandomBytes(length: number): Uint8Array {
  return sodium.randombytes_buf(length);
}

export function deriveKey(
  password: Uint8Array,
  salt: Uint8Array,
): Uint8Array {
  let key = concat(password, salt);
  for (let i = 0; i < 100000; i++) {
    key = sodium.crypto_generichash(32, key);
  }
  return key;
}

export function encryptSymmetric(
  plaintext: Uint8Array,
  key: Uint8Array,
  additionalData?: Uint8Array,
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = generateNonce();
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    additionalData || null,
    null,
    nonce,
    key,
  );
  return { ciphertext, nonce };
}

export function decryptSymmetric(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
  additionalData?: Uint8Array,
): Uint8Array {
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    additionalData || null,
    nonce,
    key,
  );
}

export function sealAsymmetric(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
): Uint8Array {
  return sodium.crypto_box_seal(plaintext, recipientPublicKey);
}

export function unsealAsymmetric(
  ciphertext: Uint8Array,
  recipientKeyPair: KeyPair,
): Uint8Array {
  return sodium.crypto_box_seal_open(
    ciphertext,
    recipientKeyPair.publicKey,
    recipientKeyPair.privateKey,
  );
}

export function encryptBox(
  plaintext: Uint8Array,
  nonce: Uint8Array,
  theirPublicKey: Uint8Array,
  ourPrivateKey: Uint8Array,
): Uint8Array {
  return sodium.crypto_box_easy(plaintext, nonce, theirPublicKey, ourPrivateKey);
}

export function decryptBox(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  theirPublicKey: Uint8Array,
  ourPrivateKey: Uint8Array,
): Uint8Array {
  return sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    theirPublicKey,
    ourPrivateKey,
  );
}

export function sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return sodium.crypto_sign_detached(message, privateKey);
}

export function verify(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return sodium.crypto_sign_verify_detached(signature, message, publicKey);
}

export function hash(data: Uint8Array): Uint8Array {
  return sodium.crypto_generichash(32, data);
}

export function computeNonce(counter: number): Uint8Array {
  const nonce = new Uint8Array(sodium.crypto_box_NONCEBYTES);
  nonce[0] = (counter >> 0) & 0xff;
  nonce[1] = (counter >> 8) & 0xff;
  nonce[2] = (counter >> 16) & 0xff;
  nonce[3] = (counter >> 24) & 0xff;
  return nonce;
}

export function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  const prk = sodium.crypto_generichash(32, ikm, salt);
  return sodium.crypto_generichash(length, info, prk);
}

export function toBase64(data: Uint8Array): string {
  return sodium.to_base64(data);
}

export function fromBase64(str: string): Uint8Array {
  return sodium.from_base64(str);
}

export function toHex(data: Uint8Array): string {
  return sodium.to_hex(data);
}

export function fromHex(str: string): Uint8Array {
  return sodium.from_hex(str);
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function equals(a: Uint8Array, b: Uint8Array): boolean {
  return sodium.memcmp(a, b);
}
