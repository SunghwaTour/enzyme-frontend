import { useEffect, useRef, useCallback, useState } from 'react';
import type { SensorReading, SensorAlert, RoomLifecycle } from '@/shared/schema';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';

interface WebSocketMessage {
  type: 'sensor_reading' | 'alert' | 'lifecycle_update' | 'connected';
  data?: SensorReading | SensorAlert | RoomLifecycle;
  timestamp?: Date;
}

interface UseWebSocketOptions {
  onSensorReading?: (reading: SensorReading) => void;
  onAlert?: (alert: SensorAlert) => void;
  onLifecycleUpdate?: (lifecycle: RoomLifecycle) => void;
  endpoint?: 'sensors' | 'alerts'; // Allow choosing which WebSocket to connect to
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onSensorReading, onAlert, onLifecycleUpdate, endpoint = 'sensors' } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      // Use Django Channels WebSocket endpoints
      const wsUrl = endpoint === 'sensors'
        ? API_ENDPOINTS.WEBSOCKET.SENSORS()
        : API_ENDPOINTS.WEBSOCKET.ALERTS();

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'sensor_reading':
              if (onSensorReading && message.data) {
                onSensorReading(message.data as SensorReading);
              }
              break;
            case 'alert':
              if (onAlert && message.data) {
                onAlert(message.data as SensorAlert);
              }
              break;
            case 'lifecycle_update':
              if (onLifecycleUpdate && message.data) {
                onLifecycleUpdate(message.data as RoomLifecycle);
              }
              break;
            case 'connected':
              console.log('WebSocket connection confirmed');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting... (attempt ${reconnectAttempts + 1})`);
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, timeout);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [reconnectAttempts, onSensorReading, onAlert, onLifecycleUpdate, endpoint]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}
