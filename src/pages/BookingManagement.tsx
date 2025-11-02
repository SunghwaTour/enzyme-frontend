import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Calendar, Search, Filter, Eye, Edit, CheckCircle, XCircle } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import type { BookingWithDetails } from "@/shared/schema";

export default function BookingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
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
    queryKey: ["/api/bookings/today"],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, action }: { bookingId: string; action: 'checkin' | 'checkout' | 'cancel' }) => {
      if (action === 'cancel') {
        return await apiRequest("PATCH", `/api/bookings/${bookingId}`, { status: 'cancelled' });
      }
      return await apiRequest("POST", `/api/bookings/${bookingId}/${action}`);
    },
    onSuccess: (_, { action }) => {
      const actionText = action === 'checkin' ? '체크인' : action === 'checkout' ? '체크아웃' : '취소';
      toast({
        title: `예약 ${actionText} 완료`,
        description: `예약이 성공적으로 ${actionText}되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/today"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "작업 실패",
        description: error.message || "작업 처리에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings.filter((booking: BookingWithDetails) => {
    const matchesSearch = booking.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.customer.phone.includes(searchTerm) ||
                         booking.room.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'secondary';
      case 'in_progress': return 'destructive';
      case 'completed': return 'default';
      case 'cancelled': return 'outline';
      case 'no_show': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '예약완료';
      case 'in_progress': return '이용중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      case 'no_show': return '미출석';
      default: return '알 수 없음';
    }
  };

  const canCheckin = (booking: BookingWithDetails) => {
    return booking.status === 'confirmed' && new Date() >= new Date(booking.startTime);
  };

  const canCheckout = (booking: BookingWithDetails) => {
    return booking.status === 'in_progress';
  };

  const canCancel = (booking: BookingWithDetails) => {
    return booking.status === 'confirmed';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">예약 관리</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1" data-testid="text-booking-management-title">예약 관리</h1>
          <p className="text-sm text-muted-foreground">고객 예약 현황을 확인하고 관리합니다</p>
        </div>
        <Button
          onClick={() => setIsBookingFormOpen(true)}
          data-testid="button-new-booking"
          size="lg"
          className="shadow-md"
        >
          <Calendar className="h-4 w-4 mr-2" />
          새 예약 생성
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="고객명, 전화번호, 관명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                  data-testid="input-search-bookings"
                />
              </div>
            </div>
            <div className="w-full md:w-56">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter" className="h-11">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="confirmed">예약완료</SelectItem>
                  <SelectItem value="in_progress">이용중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                  <SelectItem value="no_show">미출석</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-primary" data-testid="text-today-total">
                {todayBookings.length}
              </div>
              <Calendar className="h-5 w-5 text-primary/60" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">오늘 총 예약</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-600" data-testid="text-today-confirmed">
                {todayBookings.filter((b: BookingWithDetails) => b.status === 'confirmed').length}
              </div>
              <CheckCircle className="h-5 w-5 text-green-600/60" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">예약완료</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-orange-600" data-testid="text-today-in-progress">
                {todayBookings.filter((b: BookingWithDetails) => b.status === 'in_progress').length}
              </div>
              <Eye className="h-5 w-5 text-orange-600/60" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">이용중</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-600" data-testid="text-today-completed">
                {todayBookings.filter((b: BookingWithDetails) => b.status === 'completed').length}
              </div>
              <XCircle className="h-5 w-5 text-blue-600/60" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">완료</div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">예약 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-bookings">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{searchTerm || statusFilter !== "all" ? "검색 조건에 맞는 예약이 없습니다." : "예약이 없습니다."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">예약 시간</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">고객명</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">연락처</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">관</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">위치</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">이용권</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">상태</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBookings.map((booking: BookingWithDetails) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-booking-${booking.id}`}>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {new Date(booking.startTime).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-foreground" data-testid={`text-customer-name-${booking.id}`}>
                        {booking.customer.name}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground" data-testid={`text-customer-phone-${booking.id}`}>
                        {booking.customer.phone}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-foreground" data-testid={`text-room-name-${booking.id}`}>
                        {booking.room.name}
                      </td>
                      <td className="py-4 px-4 text-sm" data-testid={`text-position-${booking.id}`}>
                        <Badge variant="outline" className="font-medium">
                          {booking.position === 'shoulder' ? '어깨' : '다리'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <Badge variant={booking.passId ? "default" : "secondary"} className="font-medium">
                          {booking.passId ? "정기권" : "당일권"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <Badge
                          variant={getStatusBadgeVariant(booking.status)}
                          data-testid={`badge-status-${booking.id}`}
                          className="font-medium"
                        >
                          {getStatusText(booking.status)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5">
                          {canCheckin(booking) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, action: 'checkin' })}
                              disabled={updateBookingMutation.isPending}
                              data-testid={`button-checkin-${booking.id}`}
                              className="h-8 px-3"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              체크인
                            </Button>
                          )}
                          {canCheckout(booking) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, action: 'checkout' })}
                              disabled={updateBookingMutation.isPending}
                              data-testid={`button-checkout-${booking.id}`}
                              className="h-8 px-3"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              체크아웃
                            </Button>
                          )}
                          {canCancel(booking) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, action: 'cancel' })}
                              disabled={updateBookingMutation.isPending}
                              data-testid={`button-cancel-${booking.id}`}
                              className="h-8 px-3"
                            >
                              취소
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBooking(booking)}
                            data-testid={`button-view-${booking.id}`}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Form Modal */}
      <BookingForm 
        isOpen={isBookingFormOpen} 
        onClose={() => setIsBookingFormOpen(false)}
      />
    </div>
  );
}
