import { apiRequest } from "./queryClient";

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
      return null;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      this.user = data.user;
      this.saveToStorage();

      return this.user;
    } catch (error) {
      console.error("Failed to fetch current user:", error);
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

// Helper function to make authenticated requests
export async function authenticatedRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const headers = {
    ...authManager.getAuthHeaders(),
    ...(data && !(data instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
  };

  const response = await fetch(url, {
    method,
    headers,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (response.status === 401) {
    authManager.logout();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login")
    ) {
      window.location.href = "/login";
    }
  }

  return response;
}
