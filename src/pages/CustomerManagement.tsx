import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, UserPlus, QrCode, CreditCard, History } from "lucide-react";
import CustomerForm from "@/components/CustomerForm";
import type { Customer, CustomerWithPasses } from "@/shared/schema";

export default function CustomerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithPasses | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  const filteredCustomers = customers.filter((customer: Customer) => {
    return customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.phone.includes(searchTerm) ||
           (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleViewCustomer = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }
      
      const customerWithPasses = await response.json();
      setSelectedCustomer(customerWithPasses);
    } catch (error) {
      toast({
        title: "오류",
        description: "고객 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const getTotalSessions = (customer: CustomerWithPasses) => {
    return customer.passes?.reduce((sum, pass) => sum + pass.remainingSessions, 0) || 0;
  };

  const getLastVisit = (customer: CustomerWithPasses) => {
    if (!customer.passes || customer.passes.length === 0) return "없음";
    const lastPass = customer.passes.sort((a, b) => 
      new Date(b.updatedAt || new Date()).getTime() - new Date(a.updatedAt || new Date()).getTime()
    )[0];
    return new Date(lastPass.updatedAt || new Date()).toLocaleDateString('ko-KR');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">고객 관리</h1>
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
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-customer-management-title">고객 관리</h1>
        <Button 
          onClick={() => setIsCustomerFormOpen(true)}
          data-testid="button-new-customer"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          새 고객 등록
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="고객명, 전화번호, 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="text-total-customers">
              {customers.length}
            </div>
            <div className="text-sm text-muted-foreground">총 고객 수</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success" data-testid="text-active-customers">
              {customers.filter((c: Customer) => 
                new Date().getTime() - new Date(c.updatedAt || new Date()).getTime() < 30 * 24 * 60 * 60 * 1000
              ).length}
            </div>
            <div className="text-sm text-muted-foreground">최근 30일 활동</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent" data-testid="text-new-customers">
              {customers.filter((c: Customer) => 
                new Date().getTime() - new Date(c.createdAt || new Date()).getTime() < 7 * 24 * 60 * 60 * 1000
              ).length}
            </div>
            <div className="text-sm text-muted-foreground">이번 주 신규</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>고객 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-customers">
              {searchTerm ? "검색 조건에 맞는 고객이 없습니다." : "등록된 고객이 없습니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer: Customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow" data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {new Date(customer.createdAt || new Date()).toLocaleDateString('ko-KR')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <span className="text-muted-foreground w-16">전화:</span>
                          <span data-testid={`text-customer-phone-${customer.id}`}>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-16">이메일:</span>
                            <span className="truncate" data-testid={`text-customer-email-${customer.id}`}>{customer.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCustomer(customer)}
                            data-testid={`button-view-customer-${customer.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            이용권
                          </Button>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(customer.qrCode || '');
                              toast({ title: "QR 코드 복사됨" });
                            }}
                            data-testid={`button-qr-${customer.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>고객 상세 정보</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedCustomer(null)}
                  data-testid="button-close-customer-detail"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-selected-customer-name">
                  {selectedCustomer.name}
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>전화: {selectedCustomer.phone}</div>
                  {selectedCustomer.email && <div>이메일: {selectedCustomer.email}</div>}
                  <div>가입일: {new Date(selectedCustomer.createdAt || new Date()).toLocaleDateString('ko-KR')}</div>
                  <div>마지막 방문: {getLastVisit(selectedCustomer)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">이용권 현황</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary" data-testid="text-remaining-sessions">
                      {getTotalSessions(selectedCustomer)}
                    </div>
                    <div className="text-sm text-muted-foreground">남은 세션</div>
                  </div>
                </div>
              </div>

              {selectedCustomer.passes && selectedCustomer.passes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">이용권 내역</h4>
                  <div className="space-y-2">
                    {selectedCustomer.passes.map((pass) => (
                      <div key={pass.id} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {pass.passType === 'membership' ? '정기권' : '당일권'}
                          </span>
                          <Badge variant={pass.remainingSessions > 0 ? "default" : "outline"}>
                            {pass.remainingSessions}/{pass.totalSessions}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          구매일: {new Date(pass.purchasedAt || new Date()).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="text-muted-foreground">
                          가격: ₩{pass.purchasePrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded text-center">
                    <div className="font-mono text-xs break-all" data-testid="text-qr-code">
                      QR: {selectedCustomer.qrCode?.slice(-8)}
                    </div>
                  </div>
                  <div className="bg-muted p-2 rounded text-center">
                    <div className="font-mono text-xs break-all" data-testid="text-nfc-code">
                      NFC: {selectedCustomer.nfcCode?.slice(-8)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Customer Form Modal */}
      <CustomerForm 
        isOpen={isCustomerFormOpen} 
        onClose={() => setIsCustomerFormOpen(false)}
      />
    </div>
  );
}
