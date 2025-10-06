import { apiRequest } from "./queryClient";
import { auth } from "./firebase";
import { buildApiUrl } from "./config";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

class AuthManager {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadFromStorage();

    // Development mode auto-login disabled to prevent connection issues
    // if (import.meta.env.DEV && !this.token) {
    //   console.log("🔧 Development mode: attempting auto-login");
    //   this.attemptDevLogin();
    // }
  }

  // Development auto-login helper
  private async attemptDevLogin() {
    try {
      console.log("🔧 Attempting development auto-login...");
      const result = await this.login({
        username: "deepanimators",
        password: "admin123",
      });
      console.log(
        "🔧 Development auto-login successful:",
        result.user.username
      );
    } catch (error) {
      console.log(
        "🔧 Development auto-login failed, user needs to login manually"
      );
    }
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("auth_user");
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
          console.log("🔐 Loaded user from localStorage:", this.user?.username);
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          this.clearStorage();
        }
      } else {
        console.log("🔐 No user found in localStorage");
      }

      if (this.token) {
        console.log("🔐 Token found in localStorage:", this.token.substring(0, 20) + "...");
      } else {
        console.log("🔐 No token found in localStorage");
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      if (this.token) {
        localStorage.setItem("auth_token", this.token);
      } else {
        localStorage.removeItem("auth_token");
      }

      if (this.user) {
        localStorage.setItem("auth_user", JSON.stringify(this.user));
      } else {
        localStorage.removeItem("auth_user");
      }
    }
  }

  private clearStorage() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const authData: AuthResponse = await response.json();

    this.token = authData.token;
    this.user = authData.user;
    this.saveToStorage();

    return authData;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiRequest(
      "POST",
      "/api/auth/register",
      credentials
    );
    const authData: AuthResponse = await response.json();

    this.token = authData.token;
    this.user = authData.user;
    this.saveToStorage();

    return authData;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      console.log("🔐 No auth token found, user not authenticated");
      return null;
    }

    try {
      const apiUrl = buildApiUrl("/api/auth/me");
      console.log(
        "🔐 Fetching current user with token:",
        this.token?.substring(0, 20) + "...",
        "from URL:",
        apiUrl
      );

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      console.log("🔐 Auth response status:", response.status, response.statusText);

      if (!response.ok) {
        console.log("🔐 Auth check failed with status:", response.status);
        if (response.status === 401) {
          console.log("🔐 Token expired or invalid, logging out");
          this.logout();
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      // Handle 304 Not Modified - browser cache should have the data
      if (response.status === 304) {
        console.log("🔐 Auth response not modified (304), checking cached user");
        if (this.user) {
          console.log("🔐 Returning existing cached user:", this.user.username);
          return this.user;
        } else {
          console.log("🔐 No cached user for 304 response, this shouldn't happen");
          // If we get 304 but don't have cached user, something is wrong
          // Force a fresh request by clearing browser cache
          const freshResponse = await fetch(`${apiUrl}?nocache=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
          });

          if (freshResponse.ok && freshResponse.status !== 304) {
            const freshData = await freshResponse.json();
            console.log("🔐 Fresh auth data received:", freshData.user?.username);
            this.user = freshData.user;
            this.saveToStorage();
            return this.user;
          } else {
            console.log("🔐 Fresh request also failed or returned 304");
            return null;
          }
        }
      }

      const data = await response.json();
      console.log("🔐 Current user fetched successfully:", data.user?.username || 'unknown');
      this.user = data.user;
      this.saveToStorage();

      return this.user;
    } catch (error) {
      console.error("🔐 Failed to fetch current user:", error);
      // Don't logout on network errors - let the user try again
      console.log("🔐 Auth check failed, returning null without clearing token");
      return null;
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    this.clearStorage();
    // Don't force page reload - let React routing handle navigation
    console.log("🔐 User logged out, clearing auth state");
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  isAdmin(): boolean {
    return this.user?.role === "admin";
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }
}

export const authManager = new AuthManager();

// Helper function to make authenticated requests using traditional auth (returns JSON)
export const authenticatedRequest = async (
  method: string,
  url: string,
  body?: FormData | Record<string, any>
): Promise<any> => {
  console.log(`🌐 Making authenticated request: ${method} ${url}`);

  // Check if user is authenticated with traditional auth
  if (!authManager.isAuthenticated()) {
    console.log("🔐 User not authenticated, throwing error");
    throw new Error("Not authenticated");
  }

  console.log("🔐 User is authenticated, proceeding with request");

  const headers: Record<string, string> = {
    ...authManager.getAuthHeaders(),
  };

  let requestBody: string | FormData | undefined;

  if (body) {
    if (body instanceof FormData) {
      requestBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  const fullUrl = buildApiUrl(url);
  console.log(`🌐 Full request URL: ${fullUrl}`);

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    console.log(
      `🌐 Request failed with status: ${response.status} ${response.statusText}`
    );
    throw new Error(`Request failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`🌐 Request successful, response:`, result);
  return result;
};

// Helper function to make authenticated requests and return raw Response object
export const authenticatedFetch = async (
  method: string,
  url: string,
  body?: FormData | Record<string, any>
): Promise<Response> => {
  console.log(`🌐 Making authenticated fetch: ${method} ${url}`);

  // Check if user is authenticated with traditional auth
  if (!authManager.isAuthenticated()) {
    console.log("🔐 User not authenticated, throwing error");
    throw new Error("Not authenticated");
  }

  console.log("🔐 User is authenticated, proceeding with request");

  const headers: Record<string, string> = {
    ...authManager.getAuthHeaders(),
  };

  let requestBody: string | FormData | undefined;

  if (body) {
    if (body instanceof FormData) {
      requestBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  const fullUrl = buildApiUrl(url);
  console.log(`🌐 Full request URL: ${fullUrl}`);

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    console.log(
      `🌐 Request failed with status: ${response.status} ${response.statusText}`
    );
    throw new Error(`Request failed: ${response.statusText}`);
  }

  console.log(`🌐 Request successful, returning raw response`);
  return response;
};
