import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CustomerWithPasses } from "@/shared/schema";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerFound: (customer: CustomerWithPasses) => void;
}

export default function QRScanner({ isOpen, onClose, onCustomerFound }: QRScannerProps) {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: customer, error, isLoading } = useQuery<CustomerWithPasses>({
    queryKey: ["/api/customers/qr", scanResult],
    enabled: !!scanResult,
  });

  const startScanning = useCallback(async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleClose = () => {
    stopScanning();
    setScanResult(null);
    onClose();
  };

  const simulateQRScan = () => {
    // Simulate QR code scan for demo purposes - this won't find a real customer
    setScanResult("qr_demo_customer_123");
  };

  const handleProceedBooking = () => {
    if (customer) {
      onCustomerFound(customer);
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            고객 QR 스캔
            <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-qr-modal">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          {!scanResult && (
            <>
              <div className="w-64 h-64 border border-border rounded-lg mx-auto bg-muted flex items-center justify-center">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Camera className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                QR 코드를 카메라에 비춰주세요
              </p>
              
              {!isScanning ? (
                <div className="space-y-2">
                  <Button onClick={startScanning} className="w-full" data-testid="button-start-qr-scan">
                    <Camera className="h-4 w-4 mr-2" />
                    QR 스캔 시작
                  </Button>
                  <Button onClick={simulateQRScan} variant="outline" className="w-full" data-testid="button-simulate-qr">
                    데모용 QR 스캔
                  </Button>
                </div>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="w-full" data-testid="button-stop-scan">
                  스캔 중지
                </Button>
              )}
            </>
          )}

          {scanResult && (
            <div className="space-y-4">
              {isLoading && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">고객 정보를 확인 중...</p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                  고객을 찾을 수 없습니다.
                </div>
              )}

              {customer && (
                <div className="bg-muted p-4 rounded-lg" data-testid="customer-info">
                  <div className="text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">고객명:</span>
                      <span className="font-medium" data-testid="text-customer-name">{customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연락처:</span>
                      <span className="font-medium" data-testid="text-customer-phone">{customer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">이용권:</span>
                      <span className="font-medium text-primary" data-testid="text-customer-passes">
                        {customer.passes.filter(p => p.remainingSessions > 0).length > 0
                          ? `정기권 (${customer.passes.reduce((sum, p) => sum + p.remainingSessions, 0)}회 남음)`
                          : "이용권 없음"
                        }
                      </span>
                    </div>
                    {customer.passes.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">마지막 이용:</span>
                        <span className="font-medium" data-testid="text-last-usage">
                          {new Date(customer.passes[0].updatedAt || new Date()).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleProceedBooking} 
                    className="w-full mt-4" 
                    data-testid="button-proceed-booking"
                  >
                    예약 진행
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
