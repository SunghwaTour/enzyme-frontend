import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Room } from "@/shared/schema";

interface RoomCardProps {
  room: Room;
  occupancy?: number;
  nextBookingTime?: string;
  onBook?: () => void;
  endTime?: string;
  customers?: string[];
}

export default function RoomCard({ 
  room, 
  occupancy = 0, 
  nextBookingTime, 
  onBook, 
  endTime,
  customers = []
}: RoomCardProps) {
  const getStatusInfo = () => {
    switch (room.status) {
      case 'available':
        return {
          bgClass: "from-success/10 to-success/5 border-success/20",
          statusClass: "text-success",
          statusText: "사용 가능",
          dotClass: "bg-success animate-pulse",
          pulseClass: "pulse-available"
        };
      case 'occupied':
        return {
          bgClass: "from-destructive/10 to-destructive/5 border-destructive/20",
          statusClass: "text-destructive",
          statusText: "사용 중",
          dotClass: "bg-destructive",
          pulseClass: ""
        };
      case 'cooldown':
        return {
          bgClass: "from-warning/10 to-warning/5 border-warning/20",
          statusClass: "text-warning",
          statusText: "정화 중",
          dotClass: "bg-warning animate-pulse",
          pulseClass: ""
        };
      case 'maintenance':
        return {
          bgClass: "from-muted/10 to-muted/5 border-muted/20",
          statusClass: "text-muted-foreground",
          statusText: "점검 중",
          dotClass: "bg-muted-foreground",
          pulseClass: ""
        };
      default:
        return {
          bgClass: "from-muted/10 to-muted/5 border-muted/20",
          statusClass: "text-muted-foreground",
          statusText: "알 수 없음",
          dotClass: "bg-muted-foreground",
          pulseClass: ""
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getCooldownProgress = () => {
    if (room.status !== 'cooldown' || !room.cooldownUntil) return 0;
    
    const now = new Date().getTime();
    const cooldownEnd = new Date(room.cooldownUntil).getTime();
    const cooldownStart = room.lastUsedAt ? new Date(room.lastUsedAt).getTime() : now - (4 * 60 * 60 * 1000);
    
    const totalTime = cooldownEnd - cooldownStart;
    const elapsed = now - cooldownStart;
    
    return Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
  };

  const getRemainingCooldown = () => {
    if (room.status !== 'cooldown' || !room.cooldownUntil) return '';
    
    const now = new Date();
    const cooldownEnd = new Date(room.cooldownUntil);
    const diff = cooldownEnd.getTime() - now.getTime();
    
    if (diff <= 0) return '완료';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}시간 ${minutes}분 후`;
  };

  return (
    <Card 
      className={cn(
        "relative bg-gradient-to-br border-2 rounded-lg",
        statusInfo.bgClass,
        statusInfo.pulseClass
      )}
      data-testid={`card-room-${room.name}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-foreground" data-testid={`text-room-name-${room.id}`}>
            {room.name}
          </h4>
          <div className="flex items-center space-x-1">
            <div className={cn("w-3 h-3 rounded-full", statusInfo.dotClass)}></div>
            <Badge 
              variant="outline" 
              className={cn("text-sm font-medium", statusInfo.statusClass)}
              data-testid={`badge-room-status-${room.id}`}
            >
              {statusInfo.statusText}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">수용인원</span>
            <span className="font-medium" data-testid={`text-room-occupancy-${room.id}`}>
              {occupancy}/{room.capacity}명
            </span>
          </div>
          
          {room.status === 'available' && nextBookingTime && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">다음 예약</span>
              <span className="font-medium" data-testid={`text-next-booking-${room.id}`}>
                {nextBookingTime}
              </span>
            </div>
          )}
          
          {room.status === 'occupied' && (
            <>
              {endTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">종료 시간</span>
                  <span className="font-medium" data-testid={`text-end-time-${room.id}`}>
                    {endTime}
                  </span>
                </div>
              )}
              {customers.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">이용객</span>
                  <span className="font-medium" data-testid={`text-customers-${room.id}`}>
                    {customers.join(', ')}
                  </span>
                </div>
              )}
            </>
          )}
          
          {room.status === 'cooldown' && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">정화 완료</span>
              <span className="font-medium text-warning" data-testid={`text-cooldown-remaining-${room.id}`}>
                {getRemainingCooldown()}
              </span>
            </div>
          )}
        </div>
        
        {room.status === 'available' && onBook && (
          <Button 
            className="w-full mt-4 bg-success text-white hover:bg-success/90" 
            onClick={onBook}
            data-testid={`button-book-room-${room.id}`}
          >
            예약하기
          </Button>
        )}
        
        {room.status === 'occupied' && (
          <div className="w-full mt-4 bg-muted rounded-md p-2 text-center">
            <span className="text-sm text-muted-foreground">사용 중</span>
          </div>
        )}
        
        {room.status === 'cooldown' && (
          <div className="mt-4">
            <div 
              className="cooldown-timer h-2 rounded-full"
              style={{ "--progress": `${getCooldownProgress()}%` } as any}
              data-testid={`progress-cooldown-${room.id}`}
            ></div>
            <p className="text-xs text-warning mt-1 text-center">
              정화 진행률: {getCooldownProgress().toFixed(1)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
