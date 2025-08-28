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

    // Development mode auto-login
    if (import.meta.env.DEV && !this.token) {
      console.log("🔧 Development mode: attempting auto-login");
      this.attemptDevLogin();
    }
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
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          this.clearStorage();
        }
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
      console.log(
        "🔐 Fetching current user with token:",
        this.token?.substring(0, 20) + "..."
      );

      const response = await fetch(buildApiUrl("/api/auth/me"), {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        console.log("🔐 Auth check failed with status:", response.status);
        if (response.status === 401) {
          console.log("🔐 Token expired or invalid, logging out");
          this.logout();
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      console.log("🔐 Current user fetched successfully:", data.user.username);
      this.user = data.user;
      this.saveToStorage();

      return this.user;
    } catch (error) {
      console.error("🔐 Failed to fetch current user:", error);
      // If there's a network error or server is down, clear auth and return null
      this.logout();
      return null;
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    this.clearStorage();
    // Force page reload to clear any cached state
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
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

// Helper function to make authenticated requests using traditional auth
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
