import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { QrCode, Smartphone, User, Clock, Calendar, Thermometer, Droplets, Activity, AlertTriangle, ShieldCheck, XCircle, CheckCircle2, BookOpen } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import KnowledgeCenter from "@/components/KnowledgeCenter";
import JournalSection from "@/components/JournalSection";
import type { Room, CustomerWithPasses, SensorReading } from "@/shared/schema";
import { API_ENDPOINTS, QUERY_HELPERS } from "@/lib/apiEndpoints";

export default function CustomerApp() {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPin, setCustomerPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [currentCustomer, setCurrentCustomer] = useState<CustomerWithPasses | null>(null);

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: [API_ENDPOINTS.ROOMS.LIST],
  });

  // Django doesn't have /bookings/today - need to filter on client side or implement backend
  const { data: allBookings = [] } = useQuery<any[]>({
    queryKey: [API_ENDPOINTS.BOOKINGS.LIST],
  });

  // Filter today's bookings on client side
  const todayBookings = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.start_time);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  });

  // Fetch latest sensor data for each room
  // NOTE: This endpoint doesn't exist in Django yet - may return 404
  const { data: roomsSensorData = [] } = useQuery<{ roomId: string; reading: SensorReading | null }[]>({
    queryKey: ["rooms-sensor-data"],
    queryFn: async () => {
      const sensorData = await Promise.all(
        rooms.map(async (room) => {
          try {
            // Query sensors by room with limit=1 to get latest
            const response = await fetch(QUERY_HELPERS.sensorsByRoom(room.id, 1));
            if (response.ok) {
              const readings = await response.json();
              const reading = readings.length > 0 ? readings[0] : null;
              return { roomId: room.id, reading };
            }
            return { roomId: room.id, reading: null };
          } catch {
            return { roomId: room.id, reading: null };
          }
        })
      );
      return sensorData;
    },
    enabled: rooms.length > 0,
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const handleCustomerFound = (customer: CustomerWithPasses) => {
    setCurrentCustomer(customer);
  };

  const handlePhoneSearch = async () => {
    if (customerPhone.length < 10) {
      setPinError("전화번호를 입력해주세요");
      return;
    }

    if (customerPin.length !== 4) {
      setPinError("PIN 4자리를 입력해주세요");
      return;
    }

    setPinError("");

    try {
      // Django endpoint: /api/customers/verify_pin/
      const response = await fetch(API_ENDPOINTS.CUSTOMERS.VERIFY_PIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: customerPhone, pin: customerPin }),
      });

      if (response.ok) {
        const customer = await response.json();
        setCurrentCustomer(customer);
        setPinError("");
      } else {
        const errorData = await response.json();
        setPinError(errorData.error || errorData.message || "인증에 실패했습니다");
        setCurrentCustomer(null);
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      setPinError("서버 오류가 발생했습니다");
      setCurrentCustomer(null);
    }
  };

  const getAvailableRooms = () => {
    return rooms.filter((room: Room) => room.status === 'available').length;
  };

  const getOccupiedRooms = () => {
    return rooms.filter((room: Room) => room.status === 'occupied').length;
  };

  const getRemainingPasses = () => {
    if (!currentCustomer) return 0;
    return currentCustomer.passes?.reduce((sum, pass) => sum + pass.remainingSessions, 0) || 0;
  };

  const getMyTodayBookings = () => {
    if (!currentCustomer) return [];
    return todayBookings.filter((booking: any) => booking.customerId === currentCustomer.id);
  };

  const getCurrentBooking = () => {
    if (!currentCustomer) return null;
    return todayBookings.find((booking: any) => 
      booking.customerId === currentCustomer.id && booking.status === 'in_progress'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-customer-app-title">
            효소방 고객 서비스
          </h1>
          <p className="text-muted-foreground">QR 코드 스캔 또는 전화번호로 이용권을 확인하세요</p>
          
          <div className="flex gap-2 justify-center mt-4">
            {/* Safety Guidelines Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-safety-guidelines">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  안전 수칙
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-safety-guidelines">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  효소방 이용 주의사항
                </DialogTitle>
                <DialogDescription>
                  안전하고 건강한 이용을 위해 반드시 아래 주의사항을 확인해주세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <Clock className="h-6 w-6 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">1. 이용 시간 제한</p>
                    <p className="text-sm text-muted-foreground">1회 이용 시간은 <span className="font-bold text-foreground">20~30분 이내</span>로 제한됩니다 (최대 40분)</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <XCircle className="h-6 w-6 mt-0.5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">2. 고위험군 이용 제한</p>
                    <p className="text-sm text-muted-foreground">다음 해당자는 이용을 권장하지 않습니다:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                      <li>심장질환자, 고혈압/저혈압 환자</li>
                      <li>호흡기 질환자 (천식, COPD 등)</li>
                      <li>임산부, 영유아</li>
                      <li>피부질환자 (아토피, 습진 등)</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <AlertTriangle className="h-6 w-6 mt-0.5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">3. 음주 후 이용 금지</p>
                    <p className="text-sm text-muted-foreground">음주 상태에서는 <span className="font-bold text-foreground">절대 이용 불가</span>합니다</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <Droplets className="h-6 w-6 mt-0.5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">4. 충분한 수분 섭취</p>
                    <p className="text-sm text-muted-foreground">땀을 많이 흘리므로 이용 전 <span className="font-bold text-foreground">충분한 수분 섭취</span>가 필요합니다</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-6 w-6 mt-0.5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">5. 이상 증상 발생 시</p>
                    <p className="text-sm text-muted-foreground">어지럼증, 답답함 등 이상 증상 발생 시 <span className="font-bold text-foreground">즉시 직원에게 알려주세요</span></p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <ShieldCheck className="h-6 w-6 mt-0.5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">6. 개인 위생</p>
                    <p className="text-sm text-muted-foreground">상처, 피부질환이 있는 경우 <span className="font-bold text-foreground">이용을 삼가주세요</span></p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle2 className="h-6 w-6 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-lg mb-1">7. 이용 규칙 준수</p>
                    <p className="text-sm text-muted-foreground">쾌적한 환경 유지를 위해 <span className="font-bold text-foreground">이용 규칙을 꼭 지켜주세요</span></p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Knowledge Center Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-knowledge-center">
                <BookOpen className="h-4 w-4 mr-2" />
                효소욕 알아보기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden" data-testid="dialog-knowledge-center">
              <KnowledgeCenter />
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {!currentCustomer ? (
          <div className="space-y-6">
            {/* Status Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-success mb-2" data-testid="text-available-rooms">
                    {getAvailableRooms()}
                  </div>
                  <div className="text-sm text-muted-foreground">사용 가능한 관</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-warning mb-2" data-testid="text-occupied-rooms">
                    {getOccupiedRooms()}
                  </div>
                  <div className="text-sm text-muted-foreground">사용 중인 관</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2" data-testid="text-total-rooms">
                    {rooms.length}
                  </div>
                  <div className="text-sm text-muted-foreground">전체 관</div>
                </CardContent>
              </Card>
            </div>

            {/* Current Environment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <span>현재 환경 상태</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rooms.map((room) => {
                    const sensorData = roomsSensorData.find(s => s.roomId === room.id);
                    const reading = sensorData?.reading;
                    
                    return (
                      <div 
                        key={room.id} 
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`room-environment-${room.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{room.name}</h3>
                          <Badge variant={room.status === 'available' ? 'default' : 'secondary'}>
                            {room.status === 'available' ? '이용 가능' : 
                             room.status === 'occupied' ? '사용 중' : 
                             room.status === 'cooldown' ? '냉각 중' : '점검 중'}
                          </Badge>
                        </div>
                        
                        {reading ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Thermometer className="h-3 w-3" />
                                <span>온도</span>
                              </div>
                              <p className="text-xl font-bold">
                                {(reading.temperature / 10).toFixed(1)}°C
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Droplets className="h-3 w-3" />
                                <span>습도</span>
                              </div>
                              <p className="text-xl font-bold">
                                {(reading.humidity / 10).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            센서 데이터 없음
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Login Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Scanner */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <QrCode className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>QR 코드 스캔</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">
                    고객님의 QR 코드를 스캔하여 이용권을 확인하세요
                  </p>
                  <Button 
                    onClick={() => setIsQRScannerOpen(true)} 
                    className="w-full"
                    data-testid="button-open-customer-qr-scanner"
                  >
                    QR 스캔하기
                  </Button>
                </CardContent>
              </Card>

              {/* Phone + PIN Input */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                    <Smartphone className="h-8 w-8 text-secondary" />
                  </div>
                  <CardTitle>전화번호 + PIN 입력</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-center">
                    등록된 전화번호와 PIN을 입력하세요
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Input
                        placeholder="010-0000-0000"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setPinError("");
                        }}
                        data-testid="input-customer-phone"
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="PIN 4자리 (휴대폰 뒷자리)"
                        value={customerPin}
                        maxLength={4}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setCustomerPin(value);
                          setPinError("");
                        }}
                        data-testid="input-customer-pin"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        초기 PIN: 휴대폰 뒷자리 4자리
                      </p>
                    </div>
                    {pinError && (
                      <p className="text-sm text-destructive" data-testid="text-pin-error">
                        {pinError}
                      </p>
                    )}
                    <Button 
                      onClick={handlePhoneSearch}
                      className="w-full"
                      disabled={customerPhone.length < 10 || customerPin.length !== 4}
                      data-testid="button-search-by-phone"
                    >
                      확인하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl" data-testid="text-current-customer-name">
                      {currentCustomer.name}님
                    </CardTitle>
                    <p className="text-muted-foreground" data-testid="text-current-customer-phone">
                      {currentCustomer.phone}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Pass Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    이용권 현황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-primary mb-2" data-testid="text-remaining-sessions">
                        {getRemainingPasses()}
                      </div>
                      <div className="text-muted-foreground">남은 세션</div>
                    </div>
                    
                    {currentCustomer.passes && currentCustomer.passes.length > 0 && (
                      <div className="space-y-2">
                        {currentCustomer.passes
                          .filter(pass => pass.remainingSessions > 0)
                          .map((pass) => (
                          <div key={pass.id} className="bg-muted p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <Badge variant={pass.passType === 'membership' ? "default" : "secondary"}>
                                {pass.passType === 'membership' ? '정기권' : '당일권'}
                              </Badge>
                              <span className="font-medium">
                                {pass.remainingSessions}/{pass.totalSessions}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    오늘 이용 현황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getMyTodayBookings().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-bookings-today">
                      오늘 예약이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getMyTodayBookings().map((booking: any) => (
                        <div key={booking.id} className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="font-medium">{booking.room.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({booking.position === 'shoulder' ? '어깨' : '다리'})
                              </span>
                            </div>
                            <Badge variant={
                              booking.status === 'completed' ? 'default' :
                              booking.status === 'in_progress' ? 'destructive' :
                              booking.status === 'confirmed' ? 'secondary' : 'outline'
                            }>
                              {booking.status === 'completed' ? '완료' :
                               booking.status === 'in_progress' ? '이용중' :
                               booking.status === 'confirmed' ? '예약완료' : '취소'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Current Session */}
            {getCurrentBooking() && (
              <Card className="border-2 border-warning">
                <CardHeader>
                  <CardTitle className="text-warning">현재 이용 중</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-warning mb-2">
                        {getCurrentBooking()?.room.name}
                      </div>
                      <div className="text-lg font-medium text-warning mb-1">
                        {getCurrentBooking()?.position === 'shoulder' ? '어깨 위치 (상단)' : '다리 위치 (하단)'}
                      </div>
                      <div className="text-muted-foreground">
                        종료 예정: {new Date(getCurrentBooking()?.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div className="bg-warning/10 p-4 rounded-lg">
                      <p className="text-sm text-warning-foreground">
                        이용 후 4시간 동안은 동일한 관을 재이용할 수 없습니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Temperature & Humidity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <span>현재 효소통 온도</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rooms.map((room) => {
                    const sensorData = roomsSensorData.find(s => s.roomId === room.id);
                    const reading = sensorData?.reading;
                    
                    return (
                      <div 
                        key={room.id} 
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`room-temp-${room.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{room.name}</h3>
                          <Badge variant={room.status === 'available' ? 'default' : 'secondary'}>
                            {room.status === 'available' ? '이용 가능' : 
                             room.status === 'occupied' ? '사용 중' : 
                             room.status === 'cooldown' ? '냉각 중' : '점검 중'}
                          </Badge>
                        </div>
                        
                        {reading ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Thermometer className="h-3 w-3" />
                                <span>온도</span>
                              </div>
                              <p className="text-xl font-bold">
                                {(reading.temperature / 10).toFixed(1)}°C
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Droplets className="h-3 w-3" />
                                <span>습도</span>
                              </div>
                              <p className="text-xl font-bold">
                                {(reading.humidity / 10).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            센서 데이터 없음
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Today's All Bookings Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>오늘 전체 예약 현황</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    오늘 예약이 없습니다
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rooms.map((room) => {
                      const roomBookings = todayBookings
                        .filter((b: any) => b.roomId === room.id && b.status !== 'cancelled')
                        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                      
                      if (roomBookings.length === 0) return null;
                      
                      return (
                        <div key={room.id} className="border rounded-lg p-4" data-testid={`bookings-${room.id}`}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            {room.name}
                            <Badge variant="outline" className="text-xs">
                              {roomBookings.length}건
                            </Badge>
                          </h3>
                          <div className="space-y-2">
                            {roomBookings.map((booking: any) => (
                              <div 
                                key={booking.id} 
                                className={`flex items-center justify-between p-2 rounded ${
                                  booking.customerId === currentCustomer.id 
                                    ? 'bg-primary/10 border border-primary/30' 
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {booking.position === 'shoulder' ? '어깨' : '다리'}
                                  </Badge>
                                  {booking.customerId === currentCustomer.id && (
                                    <Badge variant="default" className="text-xs">
                                      내 예약
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={
                                      booking.status === 'completed' ? 'default' :
                                      booking.status === 'in_progress' ? 'destructive' :
                                      'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {booking.status === 'completed' ? '완료' :
                                     booking.status === 'in_progress' ? '이용중' : '예약'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journal Section */}
            <JournalSection customerId={currentCustomer.id} />

            {/* Reset Button */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentCustomer(null);
                  setCustomerPhone("");
                  setCustomerPin("");
                  setPinError("");
                }}
                data-testid="button-logout-customer"
              >
                다른 고객으로 확인하기
              </Button>
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        <QRScanner 
          isOpen={isQRScannerOpen} 
          onClose={() => setIsQRScannerOpen(false)}
          onCustomerFound={handleCustomerFound}
        />
      </div>
    </div>
  );
}
