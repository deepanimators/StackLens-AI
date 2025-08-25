import { useEffect } from "react";
import { getRedirectResult } from "firebase/auth";
import { auth, isAuthConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/config";

interface FirebaseAuthWrapperProps {
  children: React.ReactNode;
}

export function FirebaseAuthWrapper({ children }: FirebaseAuthWrapperProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Skip Firebase auth handling if not configured
    if (!isAuthConfigured() || !auth) {
      return;
    }

    // Handle redirect result from Firebase auth
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in
          const user = result.user;
          
          // Sync user with backend
          const response = await fetch(buildApiUrl('/api/auth/firebase-signin'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }),
          });

          if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('auth_token', token);
            
            toast({
              title: "Welcome!",
              description: "Successfully signed in with Google",
            });
          }
        }
      } catch (error) {
        console.error('Firebase auth error:', error);
        toast({
          title: "Sign In Error",
          description: "Failed to sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
    };

    handleRedirectResult();
  }, [toast]);

  return <>{children}</>;
}