import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">효소방</CardTitle>
          <p className="text-muted-foreground">예약 관리 시스템</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                관리자 계정으로 로그인하여 예약과 고객을 관리하세요.
              </p>
            </div>
            
            <Button 
              onClick={handleLogin} 
              className="w-full"
              data-testid="button-login"
            >
              관리자 로그인
            </Button>
            
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-primary">3</div>
                  <div className="text-xs text-muted-foreground">관 운영</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-secondary">2</div>
                  <div className="text-xs text-muted-foreground">관당 수용</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-accent">4h</div>
                  <div className="text-xs text-muted-foreground">정화 시간</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
