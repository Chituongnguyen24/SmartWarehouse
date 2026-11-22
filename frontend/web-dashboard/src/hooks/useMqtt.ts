/**
 * useMqtt.ts
 * Custom React hook để kết nối MQTT qua WebSocket (EMQX broker.emqx.io:8084/wss)
 * Sử dụng thư viện `mqtt` (browser WebSocket)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as mqttModule from 'mqtt';

// Xử lý ESM / CJS interop linh hoạt cho Vite browser
const mqtt: any = (mqttModule as any).default || mqttModule;

export interface MqttMessage {
  topic: string;
  payload: string;
  timestamp: number;
}

export interface UseMqttOptions {
  brokerUrl?: string;
  topics: string[];
  clientIdPrefix?: string;
  onMessage?: (topic: string, payload: string) => void;
}

export interface UseMqttReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: MqttMessage | null;
  publish: (topic: string, payload: string | object) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  disconnect: () => void;
}

const DEFAULT_BROKER = 'wss://broker.emqx.io:8084/mqtt';

export function useMqtt({
  brokerUrl = DEFAULT_BROKER,
  topics,
  clientIdPrefix = 'citymart-web',
  onMessage,
}: UseMqttOptions): UseMqttReturn {
  const clientRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<MqttMessage | null>(null);

  useEffect(() => {
    let activeClient: any = null;

    try {
      const clientId = `${clientIdPrefix}-${Math.random().toString(16).slice(2, 8)}`;
      setIsConnecting(true);

      const options = {
        clientId,
        clean: true,
        reconnectPeriod: 4000,
        connectTimeout: 10000,
      };

      if (typeof mqtt?.connect === 'function') {
        activeClient = mqtt.connect(brokerUrl, options);
        clientRef.current = activeClient;

        activeClient.on('connect', () => {
          setIsConnected(true);
          setIsConnecting(false);
          console.log('[MQTT] Connected to:', brokerUrl);
          topics.forEach((t) => {
            activeClient.subscribe(t, (err: any) => {
              if (err) console.error('[MQTT] Subscribe error:', t, err);
            });
          });
        });

        activeClient.on('message', (topic: string, message: any) => {
          try {
            const payload = message?.toString ? message.toString() : String(message);
            const msg: MqttMessage = { topic, payload, timestamp: Date.now() };
            setLastMessage(msg);
            onMessage?.(topic, payload);
          } catch (e) {
            console.error('[MQTT] Error decoding message:', e);
          }
        });

        activeClient.on('error', (err: any) => {
          console.warn('[MQTT] Client warning/error:', err?.message || err);
          setIsConnecting(false);
        });

        activeClient.on('close', () => {
          setIsConnected(false);
        });

        activeClient.on('reconnect', () => {
          setIsConnecting(true);
        });
      } else {
        console.warn('[MQTT] mqtt.connect is not available in this environment');
        setIsConnecting(false);
      }
    } catch (err) {
      console.error('[MQTT] Init failed:', err);
      setIsConnecting(false);
    }

    return () => {
      try {
        if (activeClient) {
          activeClient.end(true);
        }
      } catch (e) {
        // ignore
      }
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerUrl]);

  const publish = useCallback((topic: string, payload: string | object) => {
    try {
      if (!clientRef.current?.connected) return;
      const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
      clientRef.current.publish(topic, msg, { qos: 1 });
      console.log('[MQTT] Published:', topic, msg);
    } catch (e) {
      console.error('[MQTT] Publish error:', e);
    }
  }, []);

  const subscribe = useCallback((topic: string) => {
    try {
      clientRef.current?.subscribe(topic);
    } catch (e) {
      // ignore
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    try {
      clientRef.current?.unsubscribe(topic);
    } catch (e) {
      // ignore
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      clientRef.current?.end(true);
    } catch (e) {
      // ignore
    }
  }, []);

  return { isConnected, isConnecting, lastMessage, publish, subscribe, unsubscribe, disconnect };
}
