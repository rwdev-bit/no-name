import { create } from 'zustand';
import type {
  IdentityKeys,
  IdentityFile,
  Contact,
  Conversation,
  DecryptedMessage,
  AppSettings,
  RatchetState,
} from '@/types';
import {
  generateIdentity,
  createIdentityFile,
  decryptIdentityFile,
  exportIdentityFile,
  changePassphrase,
  validatePassphrase,
  derivePublicId,
  createEmptyIdentity,
} from '@/crypto/identity';
import { toBase64, fromBase64, toHex, hash, generateRandomBytes } from '@/crypto/sodium';
import wordlist from '@/crypto/wordlist';
import {
  initializeRatchetAsSender,
  initializeRatchetAsReceiver,
  encryptRatchetMessage,
  decryptRatchetMessage,
  encryptInitialMessage,
  decryptInitialMessage,
  createHandshakeMessage,
  parseHandshakeMessage,
  serializeRatchetState,
  deserializeRatchetState,
} from '@/crypto/ratchet';

interface AppState {
  locked: boolean;
  identity: IdentityFile | null;
  identityKeys: IdentityKeys | null;
  ratchetStates: Record<string, RatchetState>;
  conversations: Conversation[];
  contacts: Contact[];
  messages: Record<string, DecryptedMessage[]>;
  settings: AppSettings;
  selectedConversationId: string | null;
  profileFileName: string | null;
  relayConnected: boolean;
  relayUrl: string;

  createNewIdentity: () => Promise<{ file: Uint8Array; fileName: string; passphrase: string }>;
  finishCreateAndUnlock: () => void;
  unlockIdentity: (fileData: Uint8Array, passphrase: string, profileFileName: string) => Promise<void>;
  lockIdentity: () => void;
  changePassphrase: (oldPass: string, newPass: string) => Uint8Array;
  exportProfile: (passphrase: string) => Uint8Array;
  generatePassphrase: () => string;

  addContact: (publicId: string, alias?: string) => void;
  removeContact: (publicId: string) => void;
  setContactAlias: (publicId: string, alias: string) => void;

  createConversation: (contactPublicId: string) => string;
  selectConversation: (id: string | null) => void;
  pinConversation: (id: string) => void;
  archiveConversation: (id: string) => void;

  sendMessage: (conversationId: string, text: string) => Promise<{ localMsg: DecryptedMessage; relayPayload: string | null; contactPublicId: string } | null>;
  receiveMessage: (senderPublicId: string, relayPayload: string) => DecryptedMessage;

  getOrCreateRatchetState: (contactPublicId: string) => Promise<RatchetState | null>;
  setRatchetState: (contactPublicId: string, state: RatchetState) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  updateDraft: (conversationId: string, draft: string) => void;

  setRelayUrl: (url: string) => void;
  setRelayConnected: (connected: boolean) => void;

  searchMessages: (query: string) => DecryptedMessage[];
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  accentColor: '#4c6ef5',
  fontSize: 'medium',
  fontFamily: 'sans',
  lockTimeout: 120,
  reducedMotion: false,
  keyboardShortcuts: {},
};

function pickRandomWords(count: number): string[] {
  const arr = new Uint32Array(count);
  crypto.getRandomValues(arr);
  const words: string[] = [];
  for (const v of arr) {
    words.push(wordlist[v % wordlist.length]);
  }
  return words;
}

export const useStore = create<AppState>((set, get) => ({
  locked: true,
  identity: null,
  identityKeys: null,
  ratchetStates: {},
  conversations: [],
  contacts: [],
  messages: {},
  settings: defaultSettings,
  selectedConversationId: null,
  profileFileName: null,
  relayConnected: false,
  relayUrl: '',

  createNewIdentity: async () => {
    const passphrase = pickRandomWords(40).join(' ');
    const identityKeys = await generateIdentity();
    const { file, passphraseVerify, salt: identitySalt } = createIdentityFile(identityKeys, passphrase);

    const identity = createEmptyIdentity(identityKeys, defaultSettings);
    identity.passphraseVerify = passphraseVerify;
    identity.salt = identitySalt;

    set({ identity, identityKeys });

    const fileName = `identity_${identityKeys.publicId.substring(0, 8)}.chatprofile`;
    set({ profileFileName: fileName });

    return { file, fileName, passphrase };
  },

  finishCreateAndUnlock: () => {
    set({ locked: false });
  },

  generatePassphrase: () => {
    return pickRandomWords(40).join(' ');
  },

  unlockIdentity: async (fileData: Uint8Array, passphrase: string, profileFileName: string) => {
    const identity = decryptIdentityFile(fileData, passphrase);

    const identityKeys: IdentityKeys = {
      publicId: identity.publicId,
      encryptionKeyPair: {
        publicKey: fromBase64(identity.publicEncryptionKey),
        privateKey: new Uint8Array(0),
      },
      signingKeyPair: {
        publicKey: fromBase64(identity.publicSigningKey),
        privateKey: new Uint8Array(0),
      },
    };

    const privateKeys = fromBase64(identity.encryptedPrivateKeys);
    identityKeys.encryptionKeyPair.privateKey = privateKeys.slice(0, 32);
    identityKeys.signingKeyPair.privateKey = privateKeys.slice(32, 64);

    const ratchetStates: Record<string, RatchetState> = {};
    for (const conv of identity.conversations) {
      const stateKey = `ratchet_${conv.contactPublicId}`;
      if (conv.id in identity) {
        const stored = (identity as any)[stateKey];
        if (stored) {
          ratchetStates[conv.contactPublicId] = deserializeRatchetState(stored);
        }
      }
    }

    set({
      identity,
      identityKeys,
      locked: false,
      contacts: identity.contacts,
      conversations: identity.conversations,
      messages: identity.messages,
      settings: identity.settings,
      profileFileName,
      ratchetStates,
    });
  },

  lockIdentity: () => {
    set({
      locked: true,
      identity: null,
      identityKeys: null,
      ratchetStates: {},
      conversations: [],
      contacts: [],
      messages: {},
      selectedConversationId: null,
      relayConnected: false,
    });
  },

  changePassphrase: (oldPass: string, newPass: string) => {
    const { identity } = get();
    if (!identity) throw new Error('Not unlocked');

    const result = changePassphrase(identity, oldPass, newPass);
    set({ identity: result.identity });
    return result.file;
  },

  exportProfile: (passphrase: string) => {
    const { identity } = get();
    if (!identity) throw new Error('Not unlocked');
    return exportIdentityFile(identity, passphrase);
  },

  addContact: (publicId: string, alias?: string) => {
    const { identity, contacts } = get();
    if (!identity) return;

    const existing = contacts.find((c) => c.publicId === publicId);
    if (existing) return;

    const newContact: Contact = {
      publicId,
      alias: alias || null,
      addedAt: Date.now(),
    };

    const updatedContacts = [...contacts, newContact];
    const updatedIdentity = { ...identity, contacts: updatedContacts };

    set({
      contacts: updatedContacts,
      identity: updatedIdentity,
    });
  },

  removeContact: (publicId: string) => {
    const { identity, contacts, conversations } = get();
    if (!identity) return;

    const updatedContacts = contacts.filter((c) => c.publicId !== publicId);
    const updatedConversations = conversations.filter(
      (c) => c.contactPublicId !== publicId,
    );
    const updatedIdentity = {
      ...identity,
      contacts: updatedContacts,
      conversations: updatedConversations,
    };

    set({
      contacts: updatedContacts,
      conversations: updatedConversations,
      identity: updatedIdentity,
    });
  },

  setContactAlias: (publicId: string, alias: string) => {
    const { identity, contacts } = get();
    if (!identity) return;

    const updatedContacts = contacts.map((c) =>
      c.publicId === publicId ? { ...c, alias } : c,
    );
    const updatedIdentity = { ...identity, contacts: updatedContacts };

    set({ contacts: updatedContacts, identity: updatedIdentity });
  },

  createConversation: (contactPublicId: string) => {
    const { identity, conversations, identityKeys } = get();
    if (!identity || !identityKeys) return '';

    const existing = conversations.find((c) => c.contactPublicId === contactPublicId);
    if (existing) return existing.id;

    const newConversation: Conversation = {
      id: toHex(hash(new TextEncoder().encode(`${contactPublicId}_${Date.now()}`))).substring(0, 16),
      contactPublicId,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      pinned: false,
      archived: false,
      draft: '',
    };

    const updatedConversations = [...conversations, newConversation];
    const updatedIdentity = { ...identity, conversations: updatedConversations };

    set({
      conversations: updatedConversations,
      identity: updatedIdentity,
      selectedConversationId: newConversation.id,
    });

    return newConversation.id;
  },

  selectConversation: (id: string | null) => {
    set({ selectedConversationId: id });
  },

  pinConversation: (id: string) => {
    const { identity, conversations } = get();
    if (!identity) return;

    const updated = conversations.map((c) =>
      c.id === id ? { ...c, pinned: !c.pinned } : c,
    );
    set({ conversations: updated, identity: { ...identity, conversations: updated } });
  },

  archiveConversation: (id: string) => {
    const { identity, conversations } = get();
    if (!identity) return;

    const updated = conversations.map((c) =>
      c.id === id ? { ...c, archived: !c.archived } : c,
    );
    set({ conversations: updated, identity: { ...identity, conversations: updated } });
  },

  getOrCreateRatchetState: async (contactPublicId: string) => {
    const { ratchetStates, identityKeys } = get();
    if (!identityKeys) throw new Error('Not unlocked');

    if (ratchetStates[contactPublicId]) {
      return ratchetStates[contactPublicId];
    }

    return null;
  },

  setRatchetState: (contactPublicId: string, state: RatchetState) => {
    const { ratchetStates } = get();
    set({
      ratchetStates: { ...ratchetStates, [contactPublicId]: state },
    });
  },

  sendMessage: async (conversationId: string, text: string) => {
    const { identity, identityKeys, conversations, messages, ratchetStates, contacts } = get();
    if (!identity || !identityKeys) return null;

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return null;

    const contactPublicId = conversation.contactPublicId;
    const contact = contacts.find((c) => c.publicId === contactPublicId);
    if (!contact) return null;

    const decryptedMessage: DecryptedMessage = {
      id: toHex(hash(new TextEncoder().encode(`${Date.now()}_${text}_${Math.random()}`))).substring(0, 16),
      conversationId,
      senderPublicId: identity.publicId,
      text,
      timestamp: Date.now(),
      sent: true,
    };

    let relayPayload: string | null = null;
    let ratchetState = ratchetStates[contactPublicId];

    if (!ratchetState || !ratchetState.theirEphemeralPublicKey) {
      ratchetState = await initializeRatchetAsSender(
        identityKeys.encryptionKeyPair,
        fromBase64(contact.publicId),
      );

      const initialMsg = encryptInitialMessage(
        identityKeys.encryptionKeyPair,
        ratchetState.ourEphemeralKeyPair,
        fromBase64(contact.publicId),
        text,
      );

      get().setRatchetState(contactPublicId, ratchetState);

      relayPayload = JSON.stringify({
        v: 1,
        type: 'initial',
        ephemeralKey: initialMsg.ephemeralPublicKey,
        ciphertext: initialMsg.ciphertext,
        identityKey: identity.publicEncryptionKey,
      });
    } else {
      const { state: newState, message } = encryptRatchetMessage(ratchetState, text);
      get().setRatchetState(contactPublicId, newState);

      relayPayload = JSON.stringify({
        v: 1,
        type: 'ratchet',
        header: message.header,
        ciphertext: message.ciphertext,
      });
    }

    const updatedMessages = {
      ...messages,
      [conversationId]: [...(messages[conversationId] || []), decryptedMessage],
    };
    const updatedConversations = conversations.map((c) =>
      c.id === conversationId ? { ...c, lastMessageAt: Date.now(), draft: '' } : c,
    );

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
      identity: { ...identity, conversations: updatedConversations, messages: updatedMessages },
    });

    return { localMsg: decryptedMessage, relayPayload, contactPublicId };
  },

  receiveMessage: (senderPublicId, relayPayload) => {
    const { identityKeys, ratchetStates, messages, identity, conversations, contacts } = get();
    if (!identityKeys || !identity) {
      throw new Error('Not unlocked');
    }

    let data: any;
    try {
      data = JSON.parse(relayPayload);
    } catch {
      throw new Error('Invalid relay payload');
    }

    let conversation = conversations.find((c) => c.contactPublicId === senderPublicId);
    if (!conversation) {
      const convId = toHex(hash(new TextEncoder().encode(`${senderPublicId}_${Date.now()}`))).substring(0, 16);
      const newConv: Conversation = {
        id: convId,
        contactPublicId: senderPublicId,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        pinned: false,
        archived: false,
        draft: '',
      };
      const updatedConversations = [...conversations, newConv];
      set({
        conversations: updatedConversations,
        identity: { ...identity, conversations: updatedConversations },
      });
      conversation = newConv;
    }

    let plaintext: string;

    if (data.type === 'initial') {
      plaintext = decryptInitialMessage(
        identityKeys.encryptionKeyPair,
        fromBase64(data.ephemeralKey),
        data.ciphertext,
      );

      const senderIdentityKey = data.identityKey
        ? fromBase64(data.identityKey)
        : fromBase64(senderPublicId);

      initializeRatchetAsReceiver(
        identityKeys.encryptionKeyPair,
        senderIdentityKey,
        fromBase64(data.ephemeralKey),
      ).then((state) => {
        get().setRatchetState(senderPublicId, state);
      });
    } else if (data.type === 'ratchet') {
      const ratchetState = ratchetStates[senderPublicId];
      if (!ratchetState) {
        throw new Error('Received ratchet message but no ratchet state exists');
      }

      const result = decryptRatchetMessage(ratchetState, {
        header: data.header,
        ciphertext: data.ciphertext,
      });
      plaintext = result.plaintext;
      get().setRatchetState(senderPublicId, result.state);
    } else {
      throw new Error('Unknown message type: ' + data.type);
    }

    const decryptedMessage: DecryptedMessage = {
      id: toHex(hash(new TextEncoder().encode(`${Date.now()}_${plaintext}_${Math.random()}`))).substring(0, 16),
      conversationId: conversation.id,
      senderPublicId,
      text: plaintext,
      timestamp: Date.now(),
      sent: false,
    };

    const updatedMsgs = { ...get().messages };
    const updatedMessages = {
      ...updatedMsgs,
      [conversation.id]: [...(updatedMsgs[conversation.id] || []), decryptedMessage],
    };

    const updatedConversations = get().conversations.map((c) =>
      c.id === conversation!.id
        ? { ...c, lastMessageAt: Date.now() }
        : c,
    );

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
      identity: { ...get().identity!, conversations: updatedConversations, messages: updatedMessages },
    });

    return decryptedMessage;
  },

  updateSettings: (newSettings: Partial<AppSettings>) => {
    const { identity, settings } = get();
    if (!identity) return;

    const updated = { ...settings, ...newSettings };
    set({
      settings: updated,
      identity: { ...identity, settings: updated },
    });
  },

  updateDraft: (conversationId: string, draft: string) => {
    const { identity, conversations } = get();
    if (!identity) return;

    const updated = conversations.map((c) =>
      c.id === conversationId ? { ...c, draft } : c,
    );
    set({
      conversations: updated,
      identity: { ...identity, conversations: updated },
    });
  },

  setRelayUrl: (url: string) => set({ relayUrl: url }),
  setRelayConnected: (connected: boolean) => set({ relayConnected: connected }),

  searchMessages: (query: string) => {
    const { messages } = get();
    const lower = query.toLowerCase();
    const results: DecryptedMessage[] = [];

    for (const convMessages of Object.values(messages)) {
      for (const msg of convMessages) {
        if (msg.text.toLowerCase().includes(lower)) {
          results.push(msg);
        }
      }
    }

    return results;
  },
}));
