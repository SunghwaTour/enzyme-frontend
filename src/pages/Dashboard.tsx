import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Users, DoorOpen, Calendar, Plus } from "lucide-react";
import RoomCard from "@/components/RoomCard";
import QRScanner from "@/components/QRScanner";
import BookingForm from "@/components/BookingForm";
import CustomerForm from "@/components/CustomerForm";
import type { Room, BookingWithDetails, CustomerWithPasses } from "@/shared/schema";

export default function Dashboard() {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithPasses | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms/"],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: todayBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/today/"],
  });

  const { data: stats } = useQuery<{totalCustomers: number; occupiedRooms: number; totalRevenue: number; passRevenue: number}>({
    queryKey: ["/api/stats/today/"],
  });

  const handleCustomerFound = (customer: CustomerWithPasses) => {
    setSelectedCustomer(customer);
    setIsBookingFormOpen(true);
  };

  const handleRoomBook = (room: Room) => {
    setSelectedRoom(room);
    setIsBookingFormOpen(true);
  };

  const getOccupancy = (roomId: string) => {
    return todayBookings.filter((booking: BookingWithDetails) => 
      booking.roomId === roomId && booking.status === 'in_progress'
    ).length;
  };

  const getNextBookingTime = (roomId: string) => {
    const upcoming = todayBookings
      .filter((booking: BookingWithDetails) => 
        booking.roomId === roomId && 
        booking.status === 'confirmed' &&
        new Date(booking.startTime) > new Date()
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    
    return upcoming ? new Date(upcoming.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : undefined;
  };

  const getRoomEndTime = (roomId: string) => {
    const current = todayBookings.find((booking: BookingWithDetails) => 
      booking.roomId === roomId && booking.status === 'in_progress'
    );
    
    return current ? new Date(current.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : undefined;
  };

  const getRoomCustomers = (roomId: string) => {
    const current = todayBookings.filter((booking: BookingWithDetails) => 
      booking.roomId === roomId && booking.status === 'in_progress'
    );
    
    return current.map(booking => `${booking.customer.name} (${booking.position === 'shoulder' ? '어깨' : '다리'})`);
  };

  const recentBookings = todayBookings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">대시보드</h1>
          <p className="text-muted-foreground">오늘 예약 현황을 확인하세요</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid="text-current-date">
              {new Date().toLocaleDateString('ko-KR')}
            </span>
          </div>
          <Button 
            onClick={() => setIsQRScannerOpen(true)} 
            className="bg-primary text-primary-foreground"
            data-testid="button-open-qr-scanner"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR 스캔
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 이용객</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-stat-customers">
                  {stats?.totalCustomers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">사용 중인 관</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-stat-occupied-rooms">
                  {stats?.occupiedRooms || 0}/{rooms.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <DoorOpen className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 수입</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-stat-revenue">
                  ₩{(stats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <span className="text-accent text-xl font-bold">₩</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">정기권 판매</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-stat-pass-revenue">
                  ₩{(stats?.passRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <span className="text-primary text-xl">🎫</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>실시간 관 현황</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => window.location.reload()}
                  data-testid="button-refresh-rooms"
                >
                  🔄
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rooms.map((room: Room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    occupancy={getOccupancy(room.id)}
                    nextBookingTime={getNextBookingTime(room.id)}
                    endTime={getRoomEndTime(room.id)}
                    customers={getRoomCustomers(room.id)}
                    onBook={() => handleRoomBook(room)}
                  />
                ))}
              </div>

              {/* Future expansion */}
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">확장 계획 (4-5관)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[4, 5].map(roomNumber => (
                    <div key={roomNumber} className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Plus className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{roomNumber}관 설치 예정</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* QR Scanner Preview */}
          <Card>
            <CardHeader>
              <CardTitle>고객 확인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg mx-auto flex items-center justify-center bg-muted/50">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">QR 코드 또는 NFC를 스캔하세요</p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => setIsQRScannerOpen(true)} 
                    className="w-full"
                    data-testid="button-start-qr-scan"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR 스캔 시작
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setIsBookingFormOpen(true)} 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-new-booking"
              >
                <Calendar className="h-4 w-4 mr-2" />
                새 예약
              </Button>
              <Button 
                onClick={() => setIsCustomerFormOpen(true)} 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-new-customer"
              >
                <Users className="h-4 w-4 mr-2" />
                고객 등록
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>최근 예약 내역</CardTitle>
            <div className="flex space-x-2">
              <Badge variant="default">오늘</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-bookings">
              오늘 예약이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">시간</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">고객명</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">관</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">이용권</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((booking: BookingWithDetails) => (
                    <tr key={booking.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-booking-${booking.id}`}>
                      <td className="py-4 px-6 text-sm">
                        {new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium" data-testid={`text-booking-customer-${booking.id}`}>
                        {booking.customer.name}
                      </td>
                      <td className="py-4 px-6 text-sm" data-testid={`text-booking-room-${booking.id}`}>
                        {booking.room.name}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <Badge variant={booking.passId ? "default" : "secondary"}>
                          {booking.passId ? "정기권" : "당일권"}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <Badge 
                          variant={
                            booking.status === 'completed' ? 'default' :
                            booking.status === 'in_progress' ? 'destructive' :
                            booking.status === 'confirmed' ? 'secondary' : 'outline'
                          }
                          data-testid={`badge-booking-status-${booking.id}`}
                        >
                          {booking.status === 'completed' ? '완료' :
                           booking.status === 'in_progress' ? '이용중' :
                           booking.status === 'confirmed' ? '예약완료' :
                           booking.status === 'cancelled' ? '취소' : '미출석'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <QRScanner 
        isOpen={isQRScannerOpen} 
        onClose={() => setIsQRScannerOpen(false)}
        onCustomerFound={handleCustomerFound}
      />
      
      <BookingForm 
        isOpen={isBookingFormOpen} 
        onClose={() => {
          setIsBookingFormOpen(false);
          setSelectedCustomer(null);
          setSelectedRoom(null);
        }}
        selectedRoom={selectedRoom || undefined}
        selectedCustomer={selectedCustomer || undefined}
      />

      <CustomerForm 
        isOpen={isCustomerFormOpen} 
        onClose={() => setIsCustomerFormOpen(false)}
      />
    </div>
  );
}
