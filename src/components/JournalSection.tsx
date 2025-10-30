import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerJournalSchema, type CustomerJournal } from "@/shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookHeart, Plus, Calendar, Image as ImageIcon, Smile } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const journalFormSchema = insertCustomerJournalSchema.extend({
  photos: z.array(z.string()).optional(),
});

type JournalFormValues = z.infer<typeof journalFormSchema>;

export default function JournalSection({ customerId }: { customerId: string }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<CustomerJournal | null>(null);
  const { toast } = useToast();

  const { data: journals = [], isLoading } = useQuery<CustomerJournal[]>({
    queryKey: ['/api/customers', customerId, 'journals'],
    enabled: !!customerId,
  });

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      customerId,
      title: "",
      content: "",
      mood: "",
      photos: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: JournalFormValues) => {
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create journal');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'journals'] });
      setIsCreateOpen(false);
      form.reset({
        customerId,
        title: "",
        content: "",
        mood: "",
        photos: [],
      });
      toast({
        title: "일지 작성 완료",
        description: "효소 일지가 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일지 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JournalFormValues) => {
    createMutation.mutate(data);
  };

  const moodOptions = [
    { value: "상쾌함", emoji: "😊", color: "text-green-500" },
    { value: "좋음", emoji: "🙂", color: "text-blue-500" },
    { value: "보통", emoji: "😐", color: "text-gray-500" },
    { value: "피곤함", emoji: "😴", color: "text-yellow-500" },
    { value: "아픔", emoji: "😣", color: "text-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookHeart className="h-5 w-5" />
            <span>나의 효소 일지</span>
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-journal">
                <Plus className="h-4 w-4 mr-1" />
                일지 작성
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>효소 일지 작성</DialogTitle>
                <DialogDescription>
                  오늘의 효소욕 경험과 느낌을 기록해보세요
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>제목 (선택)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="예: 3번째 효소욕, 오늘의 변화" 
                            data-testid="input-journal-title"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Smile className="h-4 w-4" />
                          <span>기분</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2 flex-wrap">
                            {moodOptions.map((mood) => (
                              <button
                                key={mood.value}
                                type="button"
                                onClick={() => field.onChange(mood.value)}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                  field.value === mood.value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                }`}
                                data-testid={`button-mood-${mood.value}`}
                              >
                                <span className="text-2xl">{mood.emoji}</span>
                                <span className={`ml-2 text-sm font-medium ${mood.color}`}>
                                  {mood.value}
                                </span>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>오늘의 기록</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="효소욕 후 느낌, 신체 변화, 특이사항 등을 자유롭게 기록하세요..."
                            className="min-h-[150px]"
                            data-testid="input-journal-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      data-testid="button-cancel-journal"
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit-journal"
                    >
                      {createMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩 중...
          </div>
        ) : journals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookHeart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>아직 작성한 일지가 없습니다</p>
            <p className="text-sm mt-2">효소욕 경험을 기록해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {journals.map((journal) => (
              <div 
                key={journal.id} 
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedJournal(journal)}
                data-testid={`journal-card-${journal.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {journal.title && (
                      <h3 className="font-semibold text-lg mb-1">{journal.title}</h3>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(journal.date), 'yyyy년 M월 d일', { locale: ko })}
                      </div>
                      {journal.mood && (
                        <div className="flex items-center gap-1">
                          <Smile className="h-3 w-3" />
                          {journal.mood}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {journal.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Journal Detail Dialog */}
        <Dialog open={!!selectedJournal} onOpenChange={() => setSelectedJournal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedJournal && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedJournal.title || "효소 일지"}
                  </DialogTitle>
                  <DialogDescription>
                    {format(new Date(selectedJournal.date), 'yyyy년 M월 d일 EEEE', { locale: ko })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedJournal.mood && (
                    <div className="flex items-center gap-2 text-lg">
                      <Smile className="h-5 w-5" />
                      <span className="font-medium">기분:</span>
                      <span>{selectedJournal.mood}</span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedJournal.content}</p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
