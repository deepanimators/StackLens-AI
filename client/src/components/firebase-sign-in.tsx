import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  isAuthConfigured,
  handleRedirectResult,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { FaGoogle } from "react-icons/fa";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export function FirebaseSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Handle redirect result on component mount
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result && result.user) {
          setIsLoading(true);
          await processFirebaseUser(result);
        }
      } catch (error: any) {
        console.error("Redirect result error:", error);
        toast({
          title: "Sign In Error",
          description: "Failed to complete Google sign-in redirect.",
          variant: "destructive",
        });
      }
    };

    handleRedirect();
  }, []);

  const processFirebaseUser = async (result: any) => {
    try {
      const idToken = await result.user.getIdToken();

      const response = await fetch("/api/auth/firebase-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const authData = await response.json();

        if (authData.token) {
          localStorage.setItem("auth_token", authData.token);
          localStorage.setItem("auth_user", JSON.stringify(authData.user));
        }

        toast({
          title: "Success",
          description: "Signed in successfully with Google",
        });

        // Invalidate auth queries and navigate
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

        // Add a small delay to ensure state updates, then navigate
        setTimeout(() => {
          setLocation("/dashboard");
        }, 100);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to authenticate with backend"
        );
      }
    } catch (error: any) {
      console.error("Firebase user processing error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Check if Firebase is configured
      if (!isAuthConfigured()) {
        toast({
          title: "Authentication Unavailable",
          description:
            "Firebase authentication is not configured. Please contact your administrator.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = await signInWithGoogle();

      if (result && result.user) {
        await processFirebaseUser(result);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);

      let errorMessage = "Failed to sign in with Google. Please try again.";

      if (error.message.includes("Redirecting to Google")) {
        // Redirect is happening, show loading message
        toast({
          title: "Redirecting",
          description: "Redirecting to Google sign-in...",
        });
        return; // Don't set loading to false as redirect is happening
      } else if (
        error.message.includes("cancelled") ||
        error.message.includes("closed")
      ) {
        errorMessage = "Sign-in was cancelled. Please try again.";
      } else if (error.message.includes("popup-blocked")) {
        errorMessage =
          "Popup was blocked. Please allow popups for this site and try again.";
      } else if (error.message.includes("network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });

      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Welcome to StackLens AI
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to access your log analysis dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <FaGoogle className="mr-2 h-4 w-4" />
          {isLoading ? "Signing in..." : "Sign in with Google"}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          <p>Sign in with your Google account to access StackLens AI</p>
        </div>
      </CardContent>
    </Card>
  );
}
