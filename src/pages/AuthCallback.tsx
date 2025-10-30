/**
 * Auth Callback Page
 * Handles OAuth redirect from Supabase
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setLocation("/login");
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to dashboard
          setLocation("/dashboard");
        } else {
          // No session, redirect to login
          setLocation("/login");
        }
      } catch (error) {
        console.error("Error handling auth callback:", error);
        setLocation("/login");
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
}
