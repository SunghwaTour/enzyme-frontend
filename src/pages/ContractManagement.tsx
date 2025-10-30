import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, Plus, Edit, Trash2, Download, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractSchema, type Contract, type Customer } from "@/shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const contractFormSchema = insertContractSchema.extend({
  startDate: z.string().min(1, "계약 시작일을 입력해주세요"),
  endDate: z.string().min(1, "계약 종료일을 입력해주세요"),
  signedAt: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

export default function ContractManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormValues) => {
      const res = await apiRequest("POST", "/api/contracts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setIsCreateOpen(false);
      toast({ title: "계약서가 생성되었습니다" });
    },
    onError: () => {
      toast({ title: "계약서 생성 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/contracts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setEditingContract(null);
      toast({ title: "계약서가 수정되었습니다" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "계약서가 삭제되었습니다" });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-200 text-gray-800",
      active: "bg-green-200 text-green-800",
      completed: "bg-blue-200 text-blue-800",
      cancelled: "bg-red-200 text-red-800",
    };
    const labels = {
      draft: "초안",
      active: "진행중",
      completed: "완료",
      cancelled: "취소",
    };
    return (
      <span className={`px-2 py-1 rounded text-sm ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handlePrint = (contract: Contract) => {
    const customer = customers.find(c => c.id === contract.customerId);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>계약서 - ${contract.contractNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; line-height: 1.8; }
            .terms { margin: 20px 0; white-space: pre-wrap; line-height: 1.6; }
            .signature { margin-top: 40px; }
          </style>
        </head>
        <body>
          <h1>계약서</h1>
          <div class="info">
            <p><strong>계약번호:</strong> ${contract.contractNumber}</p>
            <p><strong>고객명:</strong> ${customer?.name || '-'}</p>
            <p><strong>계약기간:</strong> ${contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : '-'} ~ ${contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : '-'}</p>
            ${contract.signedAt ? `<p><strong>서명일:</strong> ${format(new Date(contract.signedAt), 'yyyy-MM-dd')}</p>` : ''}
          </div>
          <div class="terms">
            <h3>계약 조항</h3>
            ${contract.terms || ''}
          </div>
          <div class="signature">
            <p>상기 계약 내용에 동의합니다.</p>
            <br />
            <p>고객: ${customer?.name || '_____________'} (서명)</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">계약서 관리</h1>
          <p className="text-muted-foreground mt-1">고객과의 계약서를 작성하고 관리합니다</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-contract">
              <Plus className="h-4 w-4 mr-2" />
              새 계약서
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 계약서 작성</DialogTitle>
            </DialogHeader>
            <ContractForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              customers={customers}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            계약서 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">로딩 중...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              아직 작성된 계약서가 없습니다.
              <br />
              새 계약서 버튼을 눌러 첫 계약서를 작성해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => {
                const customer = customers.find(c => c.id === contract.customerId);
                return (
                  <Card key={contract.id} data-testid={`contract-card-${contract.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg" data-testid={`contract-number-${contract.id}`}>
                              {contract.contractNumber}
                            </h3>
                            {getStatusBadge(contract.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            고객: {customer?.name || '미지정'}
                          </p>
                          <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            계약기간: {contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : '-'} ~ {contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : '-'}
                          </p>
                          {contract.signedAt && (
                            <p className="text-sm text-muted-foreground">
                              서명일: {format(new Date(contract.signedAt), 'yyyy-MM-dd')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(contract)}
                            data-testid={`button-print-${contract.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingContract(contract)}
                                data-testid={`button-edit-${contract.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>계약서 수정</DialogTitle>
                              </DialogHeader>
                              {editingContract && (
                                <ContractForm
                                  contract={editingContract}
                                  onSubmit={(data) => updateMutation.mutate({ id: editingContract.id, data })}
                                  isPending={updateMutation.isPending}
                                  customers={customers}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("정말 삭제하시겠습니까?")) {
                                deleteMutation.mutate(contract.id);
                              }
                            }}
                            data-testid={`button-delete-${contract.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContractForm({
  contract,
  onSubmit,
  isPending,
  customers,
}: {
  contract?: Contract;
  onSubmit: (data: ContractFormValues) => void;
  isPending: boolean;
  customers: Customer[];
}) {
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractNumber: contract?.contractNumber || `C-${Date.now()}`,
      customerId: contract?.customerId || "",
      quoteId: contract?.quoteId || undefined,
      terms: contract?.terms || "",
      startDate: contract?.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : "",
      endDate: contract?.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : "",
      signedAt: contract?.signedAt ? format(new Date(contract.signedAt), 'yyyy-MM-dd') : undefined,
      status: contract?.status || "draft",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="contractNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>계약서 번호</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-contract-number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>고객</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="고객 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
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
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>계약 조항</FormLabel>
              <FormControl>
                <Textarea {...field} rows={8} placeholder="계약 조항을 입력하세요" data-testid="input-terms" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>계약 시작일</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-start-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>계약 종료일</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-end-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="signedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>서명일 (선택)</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ''} data-testid="input-signed-at" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>상태</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-contract">
            {isPending ? "처리 중..." : contract ? "수정" : "생성"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
