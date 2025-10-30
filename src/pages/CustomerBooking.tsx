import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfDay, set, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { Room, Booking, Customer } from "@/shared/schema";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

interface RoomAvailability {
  roomId: string;
  roomName: string;
  shoulderAvailable: boolean;
  legAvailable: boolean;
}

interface TimeSlotAvailability {
  [timeSlot: string]: RoomAvailability[];
}

function CheckoutForm({ 
  amount, 
  bookingData,
  paymentIntentId,
  onSuccess 
}: { 
  amount: number;
  bookingData: any;
  paymentIntentId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "결제 실패",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await apiRequest("POST", "/api/payments/confirm", {
          paymentIntentId: paymentIntent.id,
          bookingData,
        });
        
        toast({
          title: "결제 성공",
          description: "예약이 완료되었습니다!",
        });
        onSuccess();
      } catch (confirmError) {
        toast({
          title: "예약 처리 실패",
          description: "결제는 완료되었으나 예약 처리 중 오류가 발생했습니다. 관리자에게 문의해주세요.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-payment">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        data-testid="button-submit-payment"
      >
        {isProcessing ? "처리중..." : `${amount.toLocaleString()}원 결제하기`}
      </Button>
    </form>
  );
}

export default function CustomerBooking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<"shoulder" | "leg">("shoulder");
  const [customerId, setCustomerId] = useState<string>("");
  const [step, setStep] = useState<"select" | "payment" | "confirm">("select");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const { toast } = useToast();

  const { data: rooms } = useQuery<Room[]>({
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

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<TimeSlotAvailability>({
    queryKey: ["/api/bookings/availability", format(selectedDate, "yyyy-MM-dd")],
    enabled: !!selectedDate,
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { amount: number; bookingData: any }) => {
      const response = await apiRequest("POST", "/api/create-payment-intent", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setPendingBookingData(variables.bookingData);
      setStep("payment");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "결제 준비 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSelectSlot = (roomId: string, time: string, position: "shoulder" | "leg") => {
    setSelectedRoom(roomId);
    setSelectedTime(time);
    setSelectedPosition(position);
  };

  const handleProceedToPayment = () => {
    if (!selectedRoom || !selectedTime || !customerId) {
      toast({
        title: "정보 부족",
        description: "날짜, 시간, 효소통, 위치를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const bookingData = {
      customerId,
      roomId: selectedRoom,
      position: selectedPosition,
      startTime: parse(selectedTime, "HH:mm", selectedDate),
      endTime: parse(selectedTime, "HH:mm", selectedDate),
      price: 50000,
    };

    createPaymentIntentMutation.mutate({
      amount: 50000,
      bookingData,
    });
  };

  const handlePaymentSuccess = () => {
    setStep("confirm");
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
  };

  const roomsMap = rooms?.reduce((acc, room) => {
    acc[room.id] = room;
    return acc;
  }, {} as Record<string, Room>) || {};

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">효소통 예약</h1>
        <p className="text-muted-foreground" data-testid="text-description">
          원하시는 날짜와 시간, 효소통 위치를 선택하고 결제해주세요
        </p>
      </div>

      {step === "select" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1" data-testid="card-calendar">
            <CardHeader>
              <CardTitle>날짜 선택</CardTitle>
              <CardDescription>예약하실 날짜를 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ko}
                disabled={(date) => date < startOfDay(new Date())}
                className="rounded-md border"
                data-testid="calendar-date"
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card data-testid="card-time-slots">
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, "M월 d일 (E)", { locale: ko })} 예약 현황
                </CardTitle>
                <CardDescription>녹색은 예약 가능, 회색은 예약 불가</CardDescription>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <div className="text-center py-8" data-testid="text-loading">
                    시간대별 예약 현황을 불러오는 중...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {TIME_SLOTS.map((time) => (
                      <div key={time} className="space-y-2" data-testid={`slot-${time}`}>
                        <div className="font-medium text-lg">{time}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availability?.[time]?.map((avail) => (
                            <Card key={avail.roomId} className="p-4" data-testid={`room-${avail.roomId}-${time}`}>
                              <div className="font-semibold mb-3">{avail.roomName}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={
                                    selectedRoom === avail.roomId && 
                                    selectedTime === time && 
                                    selectedPosition === "shoulder"
                                      ? "default"
                                      : avail.shoulderAvailable
                                      ? "outline"
                                      : "secondary"
                                  }
                                  disabled={!avail.shoulderAvailable}
                                  onClick={() => handleSelectSlot(avail.roomId, time, "shoulder")}
                                  className="w-full"
                                  data-testid={`button-shoulder-${avail.roomId}-${time}`}
                                >
                                  어깨
                                  {avail.shoulderAvailable ? " ✓" : " ✗"}
                                </Button>
                                <Button
                                  variant={
                                    selectedRoom === avail.roomId && 
                                    selectedTime === time && 
                                    selectedPosition === "leg"
                                      ? "default"
                                      : avail.legAvailable
                                      ? "outline"
                                      : "secondary"
                                  }
                                  disabled={!avail.legAvailable}
                                  onClick={() => handleSelectSlot(avail.roomId, time, "leg")}
                                  className="w-full"
                                  data-testid={`button-leg-${avail.roomId}-${time}`}
                                >
                                  다리
                                  {avail.legAvailable ? " ✓" : " ✗"}
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedRoom && selectedTime && (
              <Card data-testid="card-booking-summary">
                <CardHeader>
                  <CardTitle>예약 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">예약자 선택</label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger data-testid="select-customer">
                        <SelectValue placeholder="예약자를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem 
                            key={customer.id} 
                            value={customer.id}
                            data-testid={`select-customer-${customer.id}`}
                          >
                            {customer.name} ({customer.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">날짜</div>
                      <div className="font-medium" data-testid="text-selected-date">
                        {format(selectedDate, "yyyy년 M월 d일 (E)", { locale: ko })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">시간</div>
                      <div className="font-medium" data-testid="text-selected-time">{selectedTime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">효소통</div>
                      <div className="font-medium" data-testid="text-selected-room">
                        {roomsMap[selectedRoom]?.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">위치</div>
                      <Badge data-testid="badge-selected-position">
                        {selectedPosition === "shoulder" ? "어깨" : "다리"}
                      </Badge>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>결제 금액</span>
                      <span data-testid="text-price">50,000원</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleProceedToPayment} 
                    className="w-full"
                    disabled={createPaymentIntentMutation.isPending || !customerId}
                    data-testid="button-proceed-payment"
                  >
                    {!customerId ? "예약자를 선택하세요" : "결제하기"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {step === "payment" && clientSecret && stripePromise && (
        <Card className="max-w-2xl mx-auto" data-testid="card-payment">
          <CardHeader>
            <CardTitle>결제</CardTitle>
            <CardDescription>안전한 결제를 진행합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                amount={50000} 
                bookingData={pendingBookingData}
                paymentIntentId={paymentIntentId}
                onSuccess={handlePaymentSuccess} 
              />
            </Elements>
          </CardContent>
        </Card>
      )}
      
      {step === "payment" && !stripePromise && (
        <Card className="max-w-2xl mx-auto" data-testid="card-payment-unavailable">
          <CardHeader>
            <CardTitle>결제 기능 사용 불가</CardTitle>
            <CardDescription>Stripe 결제가 설정되지 않았습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8">
              관리자에게 Stripe 결제 설정을 요청해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card className="max-w-2xl mx-auto" data-testid="card-success">
          <CardHeader>
            <CardTitle className="text-green-600">예약 완료!</CardTitle>
            <CardDescription>예약이 성공적으로 완료되었습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✓</div>
              <p className="text-lg" data-testid="text-success-message">
                {format(selectedDate, "M월 d일 (E)", { locale: ko })} {selectedTime}에<br />
                {roomsMap[selectedRoom]?.name} {selectedPosition === "shoulder" ? "어깨" : "다리"} 위치로<br />
                예약이 완료되었습니다!
              </p>
            </div>
            <Button 
              onClick={() => {
                setStep("select");
                setSelectedRoom("");
                setSelectedTime("");
                setClientSecret("");
              }}
              className="w-full"
              data-testid="button-new-booking"
            >
              새 예약하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
