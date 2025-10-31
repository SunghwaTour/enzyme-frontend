import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  DoorOpen, 
  Calendar, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  ChevronDown,
  Waves,
  TabletSmartphone,
  LogOut,
  Thermometer,
  ShieldCheck,
  FileText,
  FileSignature
} from "lucide-react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import RoomManagement from "@/pages/RoomManagement";
import BookingManagement from "@/pages/BookingManagement";
import CustomerManagement from "@/pages/CustomerManagement";
import PassManagement from "@/pages/PassManagement";
import CustomerApp from "@/pages/CustomerApp";
import SensorMonitoring from "@/pages/SensorMonitoring";
import SafetyManagement from "@/pages/SafetyManagement";
import QuoteManagement from "@/pages/QuoteManagement";
import ContractManagement from "@/pages/ContractManagement";
import CustomerBooking from "@/pages/CustomerBooking";

function AppSidebar() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Waves className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">효소방</h1>
            <p className="text-sm text-muted-foreground">관리 시스템</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard" data-testid="nav-dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>대시보드</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/rooms" data-testid="nav-rooms">
                <DoorOpen className="h-4 w-4" />
                <span>관 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/bookings" data-testid="nav-bookings">
                <Calendar className="h-4 w-4" />
                <span>예약 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/customers" data-testid="nav-customers">
                <Users className="h-4 w-4" />
                <span>고객 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/passes" data-testid="nav-passes">
                <CreditCard className="h-4 w-4" />
                <span>이용권 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/sensors" data-testid="nav-sensors">
                <Thermometer className="h-4 w-4" />
                <span>센서 모니터링</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/safety" data-testid="nav-safety">
                <ShieldCheck className="h-4 w-4" />
                <span>안전 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/quotes" data-testid="nav-quotes">
                <FileText className="h-4 w-4" />
                <span>견적서 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/contracts" data-testid="nav-contracts">
                <FileSignature className="h-4 w-4" />
                <span>계약서 관리</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/customer-app" data-testid="nav-customer-app">
                <TabletSmartphone className="h-4 w-4" />
                <span>고객용 앱</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="nav-logout">
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        {/* Public routes */}
        <Route path="/customer-app" component={CustomerApp} />
        <Route path="/customer" component={CustomerApp} />
        <Route path="/booking" component={CustomerBooking} />
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />

        {/* Redirect to login for protected routes */}
        <Route path="/:rest*">
          {() => {
            if (typeof window !== 'undefined') {
              window.location.href = "/login";
            }
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Customer App - No authentication required */}
      <Route path="/customer-app" component={CustomerApp} />
      <Route path="/customer" component={CustomerApp} />
      <Route path="/booking" component={CustomerBooking} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Authenticated admin routes with layout */}
      <Route path="/:rest*">
        {() => (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <Switch>
                  <Route path="/">
                    {() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = "/dashboard";
                      }
                      return null;
                    }}
                  </Route>
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/admin" component={Dashboard} />
                  <Route path="/rooms" component={RoomManagement} />
                  <Route path="/bookings" component={BookingManagement} />
                  <Route path="/customers" component={CustomerManagement} />
                  <Route path="/passes" component={PassManagement} />
                  <Route path="/sensors" component={SensorMonitoring} />
                  <Route path="/safety" component={SafetyManagement} />
                  <Route path="/quotes" component={QuoteManagement} />
                  <Route path="/contracts" component={ContractManagement} />
                  <Route component={NotFound} />
                </Switch>
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
