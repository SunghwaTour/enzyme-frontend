/**
 * Authentication Hook using Supabase
 *
 * This hook provides:
 * - Current authenticated user from Django backend
 * - Loading state
 * - Authentication status
 * - Sign in/out functions
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { supabase, onAuthStateChange, signInWithGoogle, signOut } from "@/lib/supabase";

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Listen to Supabase auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((session: any) => {
      setSession(session);
      setIsSessionLoading(false);

      // Invalidate user query when session changes
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.AUTH.USER] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Fetch user data from Django backend
  const { data: user, isLoading: isUserLoading, error, refetch } = useQuery({
    queryKey: [API_ENDPOINTS.AUTH.USER],
    enabled: !!session, // Only fetch if we have a Supabase session
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    user,
    session,
    isLoading: isSessionLoading || (!!session && isUserLoading),
    isAuthenticated: !!session && !!user,
    error,
    signInWithGoogle,
    signOut: async () => {
      await signOut();
      queryClient.clear(); // Clear all queries on sign out
    },
    refetch,
  };
}
