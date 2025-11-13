import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import type { Room } from "@/shared/schema";

export default function RoomManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: [API_ENDPOINTS.ROOMS.LIST],
    select: (data: any) => {
      // Django REST Framework pagination: extract results array
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results;
      }
      // If it's already an array, return as is
      return Array.isArray(data) ? data : [];
    },
  });

  const updateRoomStatusMutation = useMutation({
    mutationFn: async ({ roomId, status, cooldownUntil }: { roomId: string; status: string; cooldownUntil?: Date }) => {
      return await apiRequest("PATCH", `/api/rooms/${roomId}/status`, { status, cooldownUntil });
    },
    onSuccess: () => {
      toast({
        title: "관 상태 업데이트",
        description: "관 상태가 성공적으로 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ROOMS.LIST] });
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
        title: "업데이트 실패",
        description: error.message || "관 상태 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (roomId: string, newStatus: Room['status']) => {
    let cooldownUntil: Date | undefined;
    
    if (newStatus === 'cooldown') {
      cooldownUntil = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
    }
    
    updateRoomStatusMutation.mutate({ roomId, status: newStatus, cooldownUntil });
  };

  const getStatusBadgeVariant = (status: Room['status']) => {
    switch (status) {
      case 'available': return 'default';
      case 'occupied': return 'destructive';
      case 'cooldown': return 'secondary';
      case 'maintenance': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: Room['status']) => {
    switch (status) {
      case 'available': return '사용 가능';
      case 'occupied': return '사용 중';
      case 'cooldown': return '정화 중';
      case 'maintenance': return '점검 중';
      default: return '알 수 없음';
    }
  };

  const getRemainingCooldown = (room: Room) => {
    if (room.status !== 'cooldown' || !room.cooldownUntil) return '';
    
    const now = new Date();
    const cooldownEnd = new Date(room.cooldownUntil);
    const diff = cooldownEnd.getTime() - now.getTime();
    
    if (diff <= 0) return '완료';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}시간 ${minutes}분 남음`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">관 관리</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground" data-testid="text-room-management-title">관 관리</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room: Room) => (
          <Card key={room.id} className="relative" data-testid={`card-room-management-${room.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg" data-testid={`text-room-title-${room.id}`}>
                  {room.name}
                </CardTitle>
                <Badge 
                  variant={getStatusBadgeVariant(room.status)}
                  data-testid={`badge-room-status-${room.id}`}
                >
                  {getStatusText(room.status)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">수용 인원:</span>
                  <span>{room.capacity}명 (어깨/다리 각 1명)</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">효소통 크기:</span>
                  <span>{room.width || 130}cm × {room.length || 360}cm × {room.height || 72}cm</span>
                </div>
                
                {room.lastUsedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">마지막 이용:</span>
                    <span>{new Date(room.lastUsedAt).toLocaleString('ko-KR')}</span>
                  </div>
                )}
                
                {room.status === 'cooldown' && room.cooldownUntil && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">정화 완료:</span>
                    <span className="text-warning" data-testid={`text-cooldown-remaining-${room.id}`}>
                      {getRemainingCooldown(room)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">상태 변경:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={room.status === 'available' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(room.id, 'available')}
                    disabled={updateRoomStatusMutation.isPending || room.status === 'available'}
                    data-testid={`button-set-available-${room.id}`}
                  >
                    사용 가능
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={room.status === 'occupied' ? 'destructive' : 'outline'}
                    onClick={() => handleStatusChange(room.id, 'occupied')}
                    disabled={updateRoomStatusMutation.isPending || room.status === 'occupied'}
                    data-testid={`button-set-occupied-${room.id}`}
                  >
                    사용 중
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={room.status === 'cooldown' ? 'secondary' : 'outline'}
                    onClick={() => handleStatusChange(room.id, 'cooldown')}
                    disabled={updateRoomStatusMutation.isPending || room.status === 'cooldown'}
                    data-testid={`button-set-cooldown-${room.id}`}
                  >
                    정화 중
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={room.status === 'maintenance' ? 'outline' : 'outline'}
                    onClick={() => handleStatusChange(room.id, 'maintenance')}
                    disabled={updateRoomStatusMutation.isPending || room.status === 'maintenance'}
                    data-testid={`button-set-maintenance-${room.id}`}
                  >
                    점검 중
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Future expansion slots */}
        {[4, 5].map(roomNumber => (
          <Card key={`future-${roomNumber}`} className="border-dashed">
            <CardContent className="flex items-center justify-center h-48 text-center">
              <div>
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">+</span>
                </div>
                <p className="text-sm text-muted-foreground">{roomNumber}관 설치 예정</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
