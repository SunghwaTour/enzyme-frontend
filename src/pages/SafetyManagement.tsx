import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck, 
  ClipboardCheck, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import type { SafetyChecklistItem, SafetyCheckRecord } from "@/shared/schema";

export default function SafetyManagement() {
  const { toast } = useToast();
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>({});

  // Fetch checklist items
  const { data: checklistItems = [], isLoading: isLoadingItems } = useQuery<SafetyChecklistItem[]>({
    queryKey: ["/api/safety/checklist-items"],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch today's check records
  const { data: todayRecords = [], isLoading: isLoadingRecords } = useQuery<SafetyCheckRecord[]>({
    queryKey: ["/api/safety/check-records/today"],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  // Create check record mutation
  const createCheckMutation = useMutation({
    mutationFn: async (data: { checklistItemId: string; checkedBy: string; notes?: string; status: string }) => {
      return await apiRequest("POST", "/api/safety/check-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safety/check-records/today"] });
      toast({
        title: "체크 완료",
        description: "안전 점검이 기록되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Failed to create safety check record:", error);
      toast({
        title: "오류",
        description: "점검 기록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Group items by category
  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SafetyChecklistItem[]>);

  const categoryLabels: Record<string, string> = {
    hygiene: "위생 관리",
    environment: "환경 관리",
    safety: "안전 관리",
    emergency: "응급 대응"
  };

  const categoryIcons: Record<string, any> = {
    hygiene: ShieldCheck,
    environment: ClipboardCheck,
    safety: AlertTriangle,
    emergency: CheckCircle2
  };

  const handleCheck = async (itemId: string, status: "completed" | "skipped" | "issue_found") => {
    await createCheckMutation.mutateAsync({
      checklistItemId: itemId,
      checkedBy: "관리자", // In real app, use actual user info
      notes: checkNotes[itemId] || "",
      status
    });
    setCheckNotes(prev => ({ ...prev, [itemId]: "" }));
  };

  const isCheckedToday = (itemId: string) => {
    return todayRecords.some(record => record.checklistItemId === itemId);
  };

  const getRecordStatus = (itemId: string) => {
    const record = todayRecords.find(r => r.checklistItemId === itemId);
    return record?.status;
  };

  if (isLoadingItems || isLoadingRecords) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-safety-management">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">안전 관리</h1>
        <p className="text-muted-foreground mt-2">
          효소방 안전 운영을 위한 체크리스트 및 주의사항 관리
        </p>
      </div>

      {/* Safety Guidelines Card */}
      <Card data-testid="card-safety-guidelines">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            효소방 이용 주의사항
          </CardTitle>
          <CardDescription>고객에게 안내할 안전 수칙</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium">이용 시간 제한</p>
                <p className="text-sm text-muted-foreground">1회 이용 시간은 20~30분 이내로 제한 (최대 40분)</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 mt-0.5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium">고위험군 이용 제한</p>
                <p className="text-sm text-muted-foreground">심장질환, 고혈압/저혈압, 호흡기 질환, 임산부, 피부질환자는 이용을 권장하지 않습니다</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-medium">음주 후 이용 금지</p>
                <p className="text-sm text-muted-foreground">음주 상태에서는 절대 이용 불가</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">수분 섭취</p>
                <p className="text-sm text-muted-foreground">땀을 많이 흘리므로 충분한 수분 섭취 후 이용</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium">이상 증상 발생 시</p>
                <p className="text-sm text-muted-foreground">어지럼증, 답답함 등 이상 증상 발생 시 즉시 직원에게 알림</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 mt-0.5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-medium">개인 위생</p>
                <p className="text-sm text-muted-foreground">상처, 피부질환이 있는 경우 이용 삼가</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Checklist */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">일일 안전 체크리스트</h2>
          <p className="text-sm text-muted-foreground">오늘 날짜: {new Date().toLocaleDateString('ko-KR')}</p>
        </div>

        {Object.entries(groupedItems).map(([category, items]) => {
          const Icon = categoryIcons[category];
          const checkedCount = items.filter(item => isCheckedToday(item.id)).length;
          const totalCount = items.length;
          
          return (
            <Card key={category} data-testid={`card-category-${category}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {categoryLabels[category]}
                  </div>
                  <Badge variant={checkedCount === totalCount ? "default" : "secondary"}>
                    {checkedCount}/{totalCount} 완료
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => {
                  const checked = isCheckedToday(item.id);
                  const status = getRecordStatus(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 border rounded-lg ${checked ? 'bg-muted/50' : ''}`}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={checked}
                          disabled={checked}
                          className="mt-1"
                          data-testid={`checkbox-${item.id}`}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                점검 주기: {item.frequency}
                              </p>
                            </div>
                            {checked && status && (
                              <Badge 
                                variant={
                                  status === 'completed' ? 'default' : 
                                  status === 'issue_found' ? 'destructive' : 
                                  'secondary'
                                }
                                data-testid={`status-badge-${item.id}`}
                              >
                                {status === 'completed' ? '완료' : 
                                 status === 'issue_found' ? '문제 발견' : 
                                 '건너뜀'}
                              </Badge>
                            )}
                          </div>
                          
                          {!checked && (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="메모 (선택사항)"
                                value={checkNotes[item.id] || ""}
                                onChange={(e) => setCheckNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="h-20"
                                data-testid={`notes-${item.id}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCheck(item.id, "completed")}
                                  disabled={createCheckMutation.isPending}
                                  data-testid={`button-complete-${item.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  완료
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCheck(item.id, "skipped")}
                                  disabled={createCheckMutation.isPending}
                                  data-testid={`button-skip-${item.id}`}
                                >
                                  건너뛰기
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCheck(item.id, "issue_found")}
                                  disabled={createCheckMutation.isPending}
                                  data-testid={`button-issue-${item.id}`}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  문제 발견
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
