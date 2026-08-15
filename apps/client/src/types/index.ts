export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IdentityKeys {
  encryptionKeyPair: KeyPair;
  signingKeyPair: KeyPair;
  publicId: string;
}

export interface Contact {
  publicId: string;
  alias: string | null;
  addedAt: number;
}

export interface Conversation {
  id: string;
  contactPublicId: string;
  createdAt: number;
  lastMessageAt: number;
  pinned: boolean;
  archived: boolean;
  draft: string;
}

export interface EncryptedMessage {
  id: string;
  conversationId: string;
  senderPublicId: string;
  recipientPublicId: string;
  encryptedPayload: string;
  timestamp: number;
  previousMessageId: string | null;
}

export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderPublicId: string;
  text: string;
  timestamp: number;
  sent: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'sans' | 'mono' | 'serif';
  lockTimeout: number;
  reducedMotion: boolean;
  keyboardShortcuts: Record<string, string>;
}

export interface IdentityFile {
  version: number;
  publicId: string;
  publicEncryptionKey: string;
  publicSigningKey: string;
  encryptedPrivateKeys: string;
  contacts: Contact[];
  conversations: Conversation[];
  messages: Record<string, DecryptedMessage[]>;
  settings: AppSettings;
  salt: string;
  nonce: string;
  checksum: string;
  passphraseVerify: string;
}

export interface RatchetState {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
  sendingMessageKeys: Map<number, Uint8Array>;
  receivingMessageKeys: Map<number, Uint8Array>;
  sendingIndex: number;
  receivingIndex: number;
  previousSendingIndex: number;
  ourEphemeralKeyPair: KeyPair;
  theirEphemeralPublicKey: Uint8Array | null;
  ourIdentityKeyPair: KeyPair;
  theirIdentityPublicKey: Uint8Array;
}

export interface RatchetMessage {
  header: {
    ourEphemeralPublicKey: string;
    previousSendingIndex: number;
    messageIndex: number;
  };
  ciphertext: string;
}

export interface ChatProfile {
  encryptedContent: Uint8Array;
  salt: Uint8Array;
  version: number;
}
