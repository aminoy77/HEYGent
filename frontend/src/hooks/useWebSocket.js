import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(onMessage) {
  const ws = useRef(null);
  const onMsg = useRef(onMessage);
  const reconnectTimer = useRef(null);
  const dead = useRef(false);
  onMsg.current = onMessage;

  const connect = useCallback(() => {
    if (dead.current) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.hostname}:3001`;
    const socket = new WebSocket(url);

    socket.onmessage = (e) => {
      try { onMsg.current(JSON.parse(e.data)); } catch {}
    };
    socket.onopen = () => {
      onMsg.current({ type: '_connected' });
    };
    socket.onclose = () => {
      onMsg.current({ type: '_disconnected' });
      // Auto-reconnect after 2s
      if (!dead.current) {
        reconnectTimer.current = setTimeout(connect, 2000);
      }
    };
    socket.onerror = () => {
      onMsg.current({ type: '_error' });
    };

    ws.current = socket;
  }, []);

  useEffect(() => {
    dead.current = false;
    connect();
    return () => {
      dead.current = true;
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return send;
}
