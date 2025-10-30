import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertBookingSchema } from "@/shared/schema";
import { z } from "zod";
import type { Room, CustomerWithPasses } from "@/shared/schema";

const bookingFormSchema = insertBookingSchema.extend({
  phone: z.string().min(1, "전화번호를 입력해주세요"),
  passType: z.enum(["day_pass", "membership"]),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom?: Room;
  selectedCustomer?: CustomerWithPasses;
}

export default function BookingForm({ 
  isOpen, 
  onClose, 
  selectedRoom,
  selectedCustomer 
}: BookingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerData, setCustomerData] = useState<CustomerWithPasses | null>(selectedCustomer || null);

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

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      phone: selectedCustomer?.phone || "",
      roomId: selectedRoom?.id || "",
      position: "shoulder",
      passType: "day_pass",
      startTime: new Date(),
      endTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours
      price: 40000,
      status: "confirmed",
    },
  });

  const customerQuery = useQuery<CustomerWithPasses>({
    queryKey: ["/api/customers/phone", form.watch("phone")],
    enabled: !!form.watch("phone") && form.watch("phone").length >= 10,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      toast({
        title: "예약 완료",
        description: "예약이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/today"] });
      onClose();
      form.reset();
      setCustomerData(null);
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
        title: "예약 실패",
        description: error.message || "예약 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handlePhoneChange = (phone: string) => {
    form.setValue("phone", phone);
    if (customerQuery.data && !customerQuery.isLoading) {
      setCustomerData(customerQuery.data);
    }
  };

  const onSubmit = (data: BookingFormData) => {
    if (!customerData) {
      toast({
        title: "고객 정보 없음",
        description: "먼저 고객을 등록해주세요.",
        variant: "destructive",
      });
      return;
    }

    let bookingData: any = {
      customerId: customerData.id,
      roomId: data.roomId,
      position: data.position,
      startTime: data.startTime,
      endTime: data.endTime,
      status: data.status,
      price: data.passType === "day_pass" ? 40000 : 0,
    };

    if (data.passType === "membership") {
      const availablePass = customerData.passes.find(p => p.remainingSessions > 0);
      if (!availablePass) {
        toast({
          title: "이용권 없음",
          description: "사용 가능한 정기권이 없습니다.",
          variant: "destructive",
        });
        return;
      }
      bookingData.passId = availablePass.id;
    }

    createBookingMutation.mutate(bookingData);
  };

  const availableRooms = rooms.filter((room: Room) => room.status === 'available');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 예약 생성</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>고객 전화번호</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="010-0000-0000"
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerQuery.isLoading && (
              <div className="text-sm text-muted-foreground">고객 정보 확인 중...</div>
            )}

            {customerData && (
              <div className="bg-muted p-3 rounded-lg" data-testid="customer-info">
                <div className="text-sm space-y-1">
                  <div className="font-medium" data-testid="text-customer-name">{customerData.name}</div>
                  <div className="text-muted-foreground">
                    정기권: {customerData.passes.reduce((sum, p) => sum + p.remainingSessions, 0)}회 남음
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이용 관</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-room">
                        <SelectValue placeholder="관을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">자동 배정</SelectItem>
                      {availableRooms.map((room: Room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이용 위치</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-position">
                        <SelectValue placeholder="위치를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="shoulder">어깨 위치 (상단)</SelectItem>
                      <SelectItem value="leg">다리 위치 (하단)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    * 한 관에서 2명이 동시에 다른 위치를 이용할 수 있습니다
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이용권 종류</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-pass-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="day_pass">당일권 (₩40,000)</SelectItem>
                      <SelectItem 
                        value="membership"
                        disabled={!customerData || customerData.passes.reduce((sum, p) => sum + p.remainingSessions, 0) === 0}
                      >
                        정기권 사용
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1"
                data-testid="button-cancel-booking"
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={createBookingMutation.isPending || !customerData}
                className="flex-1"
                data-testid="button-create-booking"
              >
                {createBookingMutation.isPending ? "생성 중..." : "예약 생성"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
