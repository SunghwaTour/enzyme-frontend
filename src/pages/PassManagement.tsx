import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreditCard, Plus, Search, TrendingUp } from "lucide-react";
import { insertCustomerPassSchema } from "@/shared/schema";
import { z } from "zod";
import type { Customer, CustomerPass, CustomerWithPasses } from "@/shared/schema";

const passFormSchema = insertCustomerPassSchema.extend({
  customerPhone: z.string().min(1, "고객 전화번호를 입력해주세요"),
});

type PassFormData = z.infer<typeof passFormSchema>;

export default function PassManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPassFormOpen, setIsPassFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [] } = useQuery<CustomerWithPasses[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<PassFormData>({
    resolver: zodResolver(passFormSchema),
    defaultValues: {
      customerPhone: "",
      passType: "membership",
      totalSessions: 10,
      remainingSessions: 10,
      purchasePrice: 270000,
      isActive: true,
    },
  });

  const createPassMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/passes", data);
    },
    onSuccess: () => {
      toast({
        title: "이용권 생성 완료",
        description: "새 이용권이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsPassFormOpen(false);
      form.reset();
      setSelectedCustomer(null);
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
        title: "생성 실패",
        description: error.message || "이용권 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handlePhoneChange = async (phone: string) => {
    form.setValue("customerPhone", phone);
    
    if (phone.length >= 10) {
      try {
        const response = await fetch(`/api/customers/phone/${phone}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const customer = await response.json();
          setSelectedCustomer(customer);
        } else {
          setSelectedCustomer(null);
        }
      } catch (error) {
        setSelectedCustomer(null);
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  const handlePassTypeChange = (passType: string) => {
    if (passType === "day_pass") {
      form.setValue("totalSessions", 1);
      form.setValue("remainingSessions", 1);
      form.setValue("purchasePrice", 40000);
    } else {
      const sessions = form.watch("totalSessions") || 10;
      const pricePerSession = Math.max(27000, 300000 - (sessions * 3000)); // Bulk discount
      form.setValue("purchasePrice", sessions * pricePerSession);
    }
  };

  const handleSessionsChange = (sessions: number) => {
    if (form.watch("passType") === "membership") {
      const pricePerSession = Math.max(27000, 300000 - (sessions * 3000));
      form.setValue("purchasePrice", sessions * pricePerSession);
    }
    form.setValue("remainingSessions", sessions);
  };

  const onSubmit = (data: PassFormData) => {
    if (!selectedCustomer) {
      toast({
        title: "고객 정보 없음",
        description: "유효한 고객 전화번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const passData = {
      customerId: selectedCustomer.id,
      passType: data.passType,
      totalSessions: data.totalSessions,
      remainingSessions: data.remainingSessions,
      purchasePrice: data.purchasePrice,
      isActive: data.isActive,
    };

    createPassMutation.mutate(passData);
  };

  const customersWithPasses = customers.filter((customer: any) => 
    customer.passes && customer.passes.length > 0 &&
    (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     customer.phone.includes(searchTerm))
  );

  const totalRevenue = customers.reduce((sum: number, customer: any) => {
    return sum + (customer.passes?.reduce((passSum: number, pass: CustomerPass) => 
      passSum + pass.purchasePrice, 0) || 0);
  }, 0);

  const activePassesCount = customers.reduce((sum: number, customer: any) => {
    return sum + (customer.passes?.filter((pass: CustomerPass) => 
      pass.isActive && pass.remainingSessions > 0).length || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-pass-management-title">이용권 관리</h1>
        <Button 
          onClick={() => setIsPassFormOpen(true)}
          data-testid="button-new-pass"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 이용권 발급
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="text-total-revenue">
              ₩{totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">총 이용권 매출</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success" data-testid="text-active-passes">
              {activePassesCount}
            </div>
            <div className="text-sm text-muted-foreground">활성 이용권</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning" data-testid="text-total-customers-with-passes">
              {customersWithPasses.length}
            </div>
            <div className="text-sm text-muted-foreground">이용권 보유 고객</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent" data-testid="text-avg-pass-price">
              ₩{activePassesCount > 0 ? Math.round(totalRevenue / activePassesCount).toLocaleString() : 0}
            </div>
            <div className="text-sm text-muted-foreground">평균 이용권 가격</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="고객명, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-passes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pass List */}
      <Card>
        <CardHeader>
          <CardTitle>이용권 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {customersWithPasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-passes">
              {searchTerm ? "검색 조건에 맞는 이용권이 없습니다." : "발급된 이용권이 없습니다."}
            </div>
          ) : (
            <div className="space-y-4">
              {customersWithPasses.map((customer: any) => (
                <Card key={customer.id} className="bg-muted/30" data-testid={`card-customer-passes-${customer.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold" data-testid={`text-pass-customer-name-${customer.id}`}>
                          {customer.name}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-pass-customer-phone-${customer.id}`}>
                          {customer.phone}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {customer.passes.length}개 이용권
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {customer.passes.map((pass: CustomerPass) => (
                        <div 
                          key={pass.id} 
                          className="bg-card p-3 rounded-lg border"
                          data-testid={`card-pass-${pass.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={pass.passType === 'membership' ? "default" : "secondary"}>
                              {pass.passType === 'membership' ? '정기권' : '당일권'}
                            </Badge>
                            <Badge variant={pass.remainingSessions > 0 ? "default" : "outline"}>
                              {pass.isActive ? '활성' : '비활성'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">세션:</span>
                              <span className="font-medium" data-testid={`text-pass-sessions-${pass.id}`}>
                                {pass.remainingSessions}/{pass.totalSessions}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">가격:</span>
                              <span className="font-medium" data-testid={`text-pass-price-${pass.id}`}>
                                ₩{pass.purchasePrice.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">구매일:</span>
                              <span className="text-xs">
                                {new Date(pass.purchasedAt || new Date()).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            {pass.expiresAt && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">만료일:</span>
                                <span className="text-xs">
                                  {new Date(pass.expiresAt || new Date()).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pass Form Modal */}
      <Dialog open={isPassFormOpen} onOpenChange={setIsPassFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 이용권 발급</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>고객 전화번호</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="010-0000-0000"
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        data-testid="input-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCustomer && (
                <div className="bg-muted p-3 rounded-lg" data-testid="selected-customer-info">
                  <div className="text-sm">
                    <div className="font-medium" data-testid="text-selected-customer">
                      {selectedCustomer.name}
                    </div>
                    <div className="text-muted-foreground">
                      현재 이용권: {(selectedCustomer as any).passes?.filter((p: CustomerPass) => p.remainingSessions > 0).length || 0}개
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="passType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이용권 종류</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePassTypeChange(value);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-pass-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day_pass">당일권</SelectItem>
                        <SelectItem value="membership">정기권</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalSessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>총 세션 수</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min="1"
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          handleSessionsChange(value);
                        }}
                        disabled={form.watch("passType") === "day_pass"}
                        data-testid="input-total-sessions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가격 (원)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min="0"
                        data-testid="input-purchase-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPassFormOpen(false)} 
                  className="flex-1"
                  data-testid="button-cancel-pass"
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPassMutation.isPending || !selectedCustomer}
                  className="flex-1"
                  data-testid="button-create-pass"
                >
                  {createPassMutation.isPending ? "발급 중..." : "발급"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
