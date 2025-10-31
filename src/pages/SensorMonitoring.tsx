import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Activity, Bell, BellOff, TrendingUp, Clock } from "lucide-react";
import type { Room, SensorReading, SensorAlert, RoomLifecycle, SensorDataPoint } from "@/shared/schema";

interface RoomSensorData {
  room: Room;
  latestReading?: SensorReading;
  lifecycle?: RoomLifecycle | null;
  readings: SensorReading[];
}

export default function SensorMonitoring() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [sensorDataMap, setSensorDataMap] = useState<Map<string, SensorDataPoint[]>>(new Map());
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms/'],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch alerts
  const { data: alertsData = [], refetch: refetchAlerts } = useQuery<SensorAlert[]>({
    queryKey: ['/api/alerts/undismissed'],
  });

  useEffect(() => {
    setAlerts(alertsData);
  }, [alertsData]);

  // Fetch sensor data for all rooms
  const { data: roomsWithSensorData = [] } = useQuery<RoomSensorData[]>({
    queryKey: ['/api/rooms-sensor-data'],
    queryFn: async () => {
      const roomData = await Promise.all(
        rooms.map(async (room) => {
          const [roomWithData, readings] = await Promise.all([
            fetch(`/api/rooms/${room.id}/sensor-data`).then(r => r.ok ? r.json() : null),
            fetch(`/api/sensor/readings/${room.id}?limit=50`).then(r => r.ok ? r.json() : [])
          ]);
          return {
            room,
            latestReading: roomWithData?.sensorReadings?.[0],
            lifecycle: roomWithData?.lifecycle,
            readings: readings
          };
        })
      );
      return roomData;
    },
    enabled: rooms.length > 0,
    refetchInterval: 30000 // Refetch every 30 seconds as backup
  });

  // WebSocket for real-time updates
  useWebSocket({
    onSensorReading: (reading) => {
      const dataPoint: SensorDataPoint = {
        timestamp: new Date(reading.timestamp),
        temperature: reading.temperature / 10,
        humidity: reading.humidity / 10
      };

      setSensorDataMap(prev => {
        const newMap = new Map(prev);
        const roomData = newMap.get(reading.roomId) || [];
        newMap.set(reading.roomId, [...roomData.slice(-49), dataPoint]);
        return newMap;
      });
    },
    onAlert: (alert) => {
      setAlerts(prev => [alert, ...prev]);
      refetchAlerts();
    },
    onLifecycleUpdate: () => {
      // Refetch room data when lifecycle updates
    }
  });

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'birth': return 'bg-blue-500';
      case 'growth': return 'bg-green-500';
      case 'peak': return 'bg-yellow-500';
      case 'decline': return 'bg-orange-500';
      case 'rebirth': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'birth': return '탄생';
      case 'growth': return '성장';
      case 'peak': return '절정';
      case 'decline': return '노화';
      case 'rebirth': return '환생';
      default: return stage;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const formatTemperature = (temp: number) => {
    return (temp / 10).toFixed(1);
  };

  const formatHumidity = (humidity: number) => {
    return (humidity / 10).toFixed(1);
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'PATCH' });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const getChartData = (roomId: string, readings: SensorReading[]) => {
    const wsData = sensorDataMap.get(roomId) || [];
    const dbData = readings.map(r => ({
      timestamp: new Date(r.timestamp),
      temperature: r.temperature / 10,
      humidity: r.humidity / 10
    }));
    
    // Combine and sort by timestamp
    const combined = [...dbData, ...wsData].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Remove duplicates and keep latest 50
    const unique = combined.filter((item, index, arr) => 
      arr.findIndex(i => i.timestamp.getTime() === item.timestamp.getTime()) === index
    ).slice(-50);

    return unique.map(d => ({
      time: d.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      temperature: d.temperature,
      humidity: d.humidity
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">센서 모니터링</h1>
          <p className="text-muted-foreground">실시간 효소통 온습도 및 생명주기 모니터링</p>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card data-testid="alerts-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.alertType}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString('ko-KR') : '시간 미상'}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                    data-testid={`button-dismiss-${alert.id}`}
                  >
                    <BellOff className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roomsWithSensorData.map(({ room, latestReading, lifecycle, readings }) => {
          const chartData = latestReading ? getChartData(room.id, readings) : [];
          
          return (
            <Card key={room.id} data-testid={`sensor-card-${room.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{room.name}</span>
                  {lifecycle && (
                    <Badge className={getStatusColor(lifecycle.currentStage)}>
                      {getStageLabel(lifecycle.currentStage)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>실시간 센서 데이터</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestReading ? (
                  <>
                    {/* Current Readings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2" data-testid={`temp-${room.id}`}>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Thermometer className="h-4 w-4" />
                          <span>온도</span>
                        </div>
                        <p className="text-3xl font-bold">
                          {formatTemperature(latestReading.temperature)}°C
                        </p>
                      </div>
                      <div className="space-y-2" data-testid={`humidity-${room.id}`}>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Droplets className="h-4 w-4" />
                          <span>습도</span>
                        </div>
                        <p className="text-3xl font-bold">
                          {formatHumidity(latestReading.humidity)}%
                        </p>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    {chartData.length > 0 && (
                      <div className="h-48" data-testid={`chart-${room.id}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              yAxisId="left"
                              tick={{ fontSize: 10 }}
                              domain={[20, 70]}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 10 }}
                              domain={[40, 100]}
                            />
                            <Tooltip />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="temperature" 
                              stroke="#ef4444" 
                              strokeWidth={2}
                              dot={false}
                              name="온도 (°C)"
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="humidity" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={false}
                              name="습도 (%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Lifecycle Info */}
                    {lifecycle && (
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">현재 단계</span>
                          <span className="font-medium">{getStageLabel(lifecycle.currentStage)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">순환 횟수</span>
                          <span className="font-medium">{lifecycle.cycleCount}회</span>
                        </div>
                        {lifecycle.stageStartedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">단계 시작</span>
                            <span className="font-medium">
                              {new Date(lifecycle.stageStartedAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      마지막 업데이트: {new Date(latestReading.timestamp).toLocaleString('ko-KR')}
                    </p>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    센서 데이터 없음
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
