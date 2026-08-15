import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';

export function useRelay() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptRef = useRef(0);
  const sendEncryptedRef = useRef<(recipient: string, payload: string) => boolean>();

  const {
    identity,
    relayUrl,
    setRelayConnected,
    receiveMessage,
    conversations,
    locked,
  } = useStore();

  const sendEncrypted = useCallback(
    (recipientPublicId: string, payload: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'send', recipient: recipientPublicId, payload }));
      return true;
    },
    [],
  );

  sendEncryptedRef.current = sendEncrypted;

  useEffect(() => {
    (window as any).__relaySend = { sendEncrypted };
    return () => { delete (window as any).__relaySend; };
  }, [sendEncrypted]);

  const connect = useCallback(() => {
    if (locked || !identity) return;

    const url = relayUrl || `ws://${window.location.host}/ws`;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        ws.send(JSON.stringify({ type: 'auth', publicId: identity.publicId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'auth_ok') {
            setRelayConnected(true);
            return;
          }

          if (data.type === 'message') {
            const { sender, payload } = data;

            const conv = conversations.find(
              (c) => c.contactPublicId === sender,
            );
            if (!conv && conversations.length === 0 && !conversations.find((c) => c.contactPublicId === sender)) {
              console.warn('No conversation for sender:', sender);
              return;
            }

            try {
              receiveMessage(sender, payload);
            } catch {
              console.warn('Failed to decrypt incoming message');
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setRelayConnected(false);
        wsRef.current = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    } catch {}
  }, [locked, identity, relayUrl, setRelayConnected, receiveMessage, conversations]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { sendEncrypted };
}
