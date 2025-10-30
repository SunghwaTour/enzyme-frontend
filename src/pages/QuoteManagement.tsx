import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Edit, Trash2, Download, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema, type Quote, type Customer } from "@/shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const quoteFormSchema = insertQuoteSchema.extend({
  items: z.string().min(1, "항목을 입력해주세요"),
  validUntil: z.string().min(1, "유효기한을 입력해주세요"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export default function QuoteManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      const { items, ...rest } = data;
      const itemsArray = items.split('\n').filter(line => line.trim());
      const res = await apiRequest("POST", "/api/quotes", { ...rest, items: itemsArray });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setIsCreateOpen(false);
      toast({ title: "견적서가 생성되었습니다" });
    },
    onError: () => {
      toast({ title: "견적서 생성 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuoteFormValues> }) => {
      const { items, ...rest } = data;
      const body: any = rest;
      if (items) {
        body.items = items.split('\n').filter((line: string) => line.trim());
      }
      const res = await apiRequest("PATCH", `/api/quotes/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setEditingQuote(null);
      toast({ title: "견적서가 수정되었습니다" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "견적서가 삭제되었습니다" });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-200 text-gray-800",
      sent: "bg-blue-200 text-blue-800",
      accepted: "bg-green-200 text-green-800",
      rejected: "bg-red-200 text-red-800",
    };
    const labels = {
      draft: "초안",
      sent: "발송됨",
      accepted: "승인됨",
      rejected: "거부됨",
    };
    return (
      <span className={`px-2 py-1 rounded text-sm ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handlePrint = (quote: Quote) => {
    const customer = customers.find(c => c.id === quote.customerId);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const items = Array.isArray(quote.items) ? quote.items : [];
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>견적서 - ${quote.quoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .items { margin: 20px 0; }
            .item { padding: 5px 0; border-bottom: 1px solid #eee; }
            .total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h1>견적서</h1>
          <div class="info">
            <p><strong>견적서 번호:</strong> ${quote.quoteNumber}</p>
            <p><strong>고객명:</strong> ${customer?.name || '-'}</p>
            <p><strong>유효기한:</strong> ${quote.validUntil ? format(new Date(quote.validUntil), 'yyyy-MM-dd') : '-'}</p>
          </div>
          <div class="items">
            <h3>항목</h3>
            ${items.map((item: string) => `<div class="item">${item}</div>`).join('')}
          </div>
          <div class="total">
            총액: ${quote.totalAmount?.toLocaleString() || '0'}원
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
          <h1 className="text-3xl font-bold text-foreground">견적서 관리</h1>
          <p className="text-muted-foreground mt-1">고객에게 제공할 견적서를 작성하고 관리합니다</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-quote">
              <Plus className="h-4 w-4 mr-2" />
              새 견적서
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 견적서 작성</DialogTitle>
            </DialogHeader>
            <QuoteForm
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
            <FileText className="h-5 w-5" />
            견적서 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">로딩 중...</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              아직 작성된 견적서가 없습니다.
              <br />
              새 견적서 버튼을 눌러 첫 견적서를 작성해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => {
                const customer = customers.find(c => c.id === quote.customerId);
                return (
                  <Card key={quote.id} data-testid={`quote-card-${quote.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg" data-testid={`quote-number-${quote.id}`}>
                              {quote.quoteNumber}
                            </h3>
                            {getStatusBadge(quote.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            고객: {customer?.name || '미지정'}
                          </p>
                          <p className="text-sm">
                            총액: <span className="font-semibold">{quote.totalAmount?.toLocaleString() || '0'}원</span>
                          </p>
                          {quote.validUntil && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              유효기한: {format(new Date(quote.validUntil), 'yyyy-MM-dd')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(quote)}
                            data-testid={`button-print-${quote.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingQuote(quote)}
                                data-testid={`button-edit-${quote.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>견적서 수정</DialogTitle>
                              </DialogHeader>
                              {editingQuote && (
                                <QuoteForm
                                  quote={editingQuote}
                                  onSubmit={(data) => updateMutation.mutate({ id: editingQuote.id, data })}
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
                                deleteMutation.mutate(quote.id);
                              }
                            }}
                            data-testid={`button-delete-${quote.id}`}
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

function QuoteForm({
  quote,
  onSubmit,
  isPending,
  customers,
}: {
  quote?: Quote;
  onSubmit: (data: QuoteFormValues) => void;
  isPending: boolean;
  customers: Customer[];
}) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      quoteNumber: quote?.quoteNumber || `Q-${Date.now()}`,
      customerId: quote?.customerId || "",
      items: quote?.items ? (Array.isArray(quote.items) ? quote.items.join('\n') : '') : "",
      totalAmount: quote?.totalAmount || 0,
      status: quote?.status || "draft",
      validUntil: quote?.validUntil ? format(new Date(quote.validUntil), 'yyyy-MM-dd') : "",
      notes: quote?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quoteNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>견적서 번호</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-quote-number" />
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
          name="items"
          render={({ field }) => (
            <FormItem>
              <FormLabel>항목 (한 줄에 하나씩)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={5} placeholder="효소욕 10회권&#10;마사지 서비스" data-testid="input-items" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>총액 (원)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-total-amount"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>유효기한</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-valid-until" />
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
                  <SelectItem value="sent">발송됨</SelectItem>
                  <SelectItem value="accepted">승인됨</SelectItem>
                  <SelectItem value="rejected">거부됨</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} rows={3} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-quote">
            {isPending ? "처리 중..." : quote ? "수정" : "생성"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
