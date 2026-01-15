import { useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { ws } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

type WsSendEvents = typeof ws.send;
type WsReceiveEvents = typeof ws.receive;

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, (data: unknown) => void>>(new Map());
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    // Determine the protocol (ws or wss) based on the current page protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("[WS] Connected");
    };

    wsRef.current.onclose = () => {
      console.log("[WS] Disconnected");
      // Attempt reconnect after 3s
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[WS] Reconnecting...");
        connect();
      }, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    wsRef.current.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data);
        const handler = handlers.current.get(type);
        if (handler) {
          handler(payload);
        }
      } catch (err) {
        console.error("[WS] Failed to parse message", err);
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const emit = <K extends keyof WsSendEvents>(
    event: K,
    data: z.infer<WsSendEvents[K]>
  ) => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Validate data before sending
        const validated = ws.send[event].parse(data);
        wsRef.current.send(JSON.stringify({ type: event, payload: validated }));
      } else {
        console.warn("[WS] Not connected, cannot send message");
      }
    } catch (err) {
      console.error("[WS] Validation error on emit:", err);
    }
  };

  const on = <K extends keyof WsReceiveEvents>(
    event: K,
    handler: (data: z.infer<WsReceiveEvents[K]>) => void
  ) => {
    // Wrap handler to validate incoming data
    const wrappedHandler = (raw: unknown) => {
      try {
        const validated = ws.receive[event].parse(raw);
        handler(validated);
      } catch (err) {
        console.error(`[WS] Validation error on receive ${String(event)}:`, err);
      }
    };
    handlers.current.set(event as string, wrappedHandler);
  };

  const off = <K extends keyof WsReceiveEvents>(event: K) => {
    handlers.current.delete(event as string);
  };

  return { emit, on, off };
}
