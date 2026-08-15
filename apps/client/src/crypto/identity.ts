import {
  initialize,
  generateEncryptionKeyPair,
  generateSigningKeyPair,
  generateRandomBytes,
  deriveKey,
  encryptSymmetric,
  decryptSymmetric,
  toBase64,
  fromBase64,
  hash,
  toHex,
  fromHex,
  concat,
  equals,
} from './sodium';
import type {
  IdentityKeys,
  IdentityFile,
  AppSettings,
  Contact,
  Conversation,
  DecryptedMessage,
  ChatProfile,
} from '@/types';

const IDENTITY_FILE_VERSION = 1;
const FILE_MAGIC = new Uint8Array([0x6E, 0x6F, 0x6E, 0x61, 0x6D, 0x65]); // "noname"

export function derivePublicId(publicEncryptionKey: Uint8Array): string {
  const digest = hash(publicEncryptionKey);
  return toBase64(digest).substring(0, 32);
}

export async function generateIdentity(): Promise<IdentityKeys> {
  await initialize();
  const encryptionKeyPair = generateEncryptionKeyPair();
  const signingKeyPair = generateSigningKeyPair();
  const publicId = derivePublicId(encryptionKeyPair.publicKey);

  return { encryptionKeyPair, signingKeyPair, publicId };
}

export function createIdentityFile(
  identity: IdentityKeys,
  passphrase: string,
): { file: Uint8Array; checksum: string; passphraseVerify: string; salt: string } {
  const salt = generateRandomBytes(32);
  const passwordBytes = new TextEncoder().encode(passphrase);
  const encryptionKey = deriveKey(passwordBytes, salt);

  const verifyTag = hash(concat(encryptionKey, new TextEncoder().encode('no-name-verify')));
  const passphraseVerify = toBase64(verifyTag);

  const privateKeysBundle = concat(
    identity.encryptionKeyPair.privateKey,
    identity.signingKeyPair.privateKey,
  );

  const defaultSettings: AppSettings = {
    theme: 'dark',
    accentColor: '#4c6ef5',
    fontSize: 'medium',
    fontFamily: 'sans',
    lockTimeout: 120,
    reducedMotion: false,
    keyboardShortcuts: {},
  };

  const identityData: IdentityFile = {
    version: IDENTITY_FILE_VERSION,
    publicId: identity.publicId,
    publicEncryptionKey: toBase64(identity.encryptionKeyPair.publicKey),
    publicSigningKey: toBase64(identity.signingKeyPair.publicKey),
    encryptedPrivateKeys: toBase64(privateKeysBundle),
    contacts: [],
    conversations: [],
    messages: {},
    settings: defaultSettings,
    salt: toBase64(salt),
    nonce: '',
    checksum: '',
    passphraseVerify: toBase64(verifyTag),
  };

  const json = new TextEncoder().encode(JSON.stringify(identityData));
  const { ciphertext, nonce } = encryptSymmetric(json, encryptionKey);

  const fileContent = concat(
    FILE_MAGIC,
    new Uint8Array([0x00, IDENTITY_FILE_VERSION]),
    salt,
    nonce,
    ciphertext,
  );

  const checksum = toHex(hash(fileContent));

  return { file: fileContent, checksum, passphraseVerify, salt: toBase64(salt) };
}

export function decryptIdentityFile(
  fileData: Uint8Array,
  passphrase: string,
): IdentityFile {
  if (fileData.length < 6 + 1 + 32 + 24) {
    throw new Error('Invalid identity file: too small');
  }

  const magic = fileData.slice(0, 6);
  if (!equals(magic, FILE_MAGIC)) {
    throw new Error('Invalid identity file: wrong format');
  }

  const versionHigh = fileData[6];
  const versionLow = fileData[7];
  if (versionHigh !== 0 || versionLow < 1) {
    throw new Error(`Unsupported identity file version: ${versionHigh}.${versionLow}`);
  }

  let offset = 8;
  const salt = fileData.slice(offset, offset + 32);
  offset += 32;
  const nonce = fileData.slice(offset, offset + 24);
  offset += 24;
  const ciphertext = fileData.slice(offset);

  const passwordBytes = new TextEncoder().encode(passphrase);
  const encryptionKey = deriveKey(passwordBytes, salt);

  let plaintext: Uint8Array;
  try {
    plaintext = decryptSymmetric(ciphertext, nonce, encryptionKey);
  } catch {
    throw new Error('Incorrect passphrase or corrupted file');
  }

  const identityData: IdentityFile = JSON.parse(new TextDecoder().decode(plaintext));
  return identityData;
}

export function exportIdentityFile(
  identity: IdentityFile,
  passphrase: string,
): Uint8Array {
  if (identity.passphraseVerify && !verifyPassphrase(identity, passphrase)) {
    throw new Error('Incorrect passphrase');
  }

  const salt = fromBase64(identity.salt);
  const passwordBytes = new TextEncoder().encode(passphrase);
  const encryptionKey = deriveKey(passwordBytes, salt);

  const verifyTag = hash(concat(encryptionKey, new TextEncoder().encode('no-name-verify')));

  const workingCopy = { ...identity, nonce: '', checksum: '', passphraseVerify: toBase64(verifyTag) };
  const json = new TextEncoder().encode(JSON.stringify(workingCopy));
  const { ciphertext, nonce } = encryptSymmetric(json, encryptionKey);

  const fileContent = concat(
    FILE_MAGIC,
    new Uint8Array([0x00, identity.version]),
    salt,
    nonce,
    ciphertext,
  );

  return fileContent;
}

export function verifyPassphrase(
  identity: IdentityFile,
  passphrase: string,
): boolean {
  const salt = fromBase64(identity.salt);
  const passwordBytes = new TextEncoder().encode(passphrase);
  const encryptionKey = deriveKey(passwordBytes, salt);
  const verifyTag = hash(concat(encryptionKey, new TextEncoder().encode('no-name-verify')));
  return toBase64(verifyTag) === identity.passphraseVerify;
}

export function changePassphrase(
  identity: IdentityFile,
  oldPassphrase: string,
  newPassphrase: string,
): { identity: IdentityFile; file: Uint8Array } {
  if (!verifyPassphrase(identity, oldPassphrase)) {
    throw new Error('Current passphrase is incorrect');
  }

  const newSalt = generateRandomBytes(32);
  const passwordBytes = new TextEncoder().encode(newPassphrase);
  const encryptionKey = deriveKey(passwordBytes, newSalt);

  const verifyTag = hash(concat(encryptionKey, new TextEncoder().encode('no-name-verify')));

  const workingCopy: any = {
    ...identity,
    salt: toBase64(newSalt),
    nonce: '',
    checksum: '',
    passphraseVerify: toBase64(verifyTag),
  };

  const json = new TextEncoder().encode(JSON.stringify(workingCopy));
  const { ciphertext, nonce } = encryptSymmetric(json, encryptionKey);

  const fileContent = concat(
    FILE_MAGIC,
    new Uint8Array([0x00, identity.version]),
    newSalt,
    nonce,
    ciphertext,
  );

  const checksum = toHex(hash(fileContent));

  return {
    identity: { ...workingCopy, nonce: toBase64(nonce), checksum },
    file: fileContent,
  };
}

export function validatePassphrase(
  fileData: Uint8Array,
  passphrase: string,
): boolean {
  try {
    decryptIdentityFile(fileData, passphrase);
    return true;
  } catch {
    return false;
  }
}

export function createEmptyIdentity(
  identityKeys: IdentityKeys,
  settings: AppSettings,
): IdentityFile {
  return {
    version: IDENTITY_FILE_VERSION,
    publicId: identityKeys.publicId,
    publicEncryptionKey: toBase64(identityKeys.encryptionKeyPair.publicKey),
    publicSigningKey: toBase64(identityKeys.signingKeyPair.publicKey),
    encryptedPrivateKeys: toBase64(
      concat(
        identityKeys.encryptionKeyPair.privateKey,
        identityKeys.signingKeyPair.privateKey,
      ),
    ),
    contacts: [],
    conversations: [],
    messages: {},
    settings,
    salt: '',
    nonce: '',
    checksum: '',
    passphraseVerify: '',
  };
}
