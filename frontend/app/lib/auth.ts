export type AuthUser = {
    id: number;
    email: string;
    username: string;
    created_at: string;
  };
  
  export type AuthResponse = {
    access_token: string;
    token_type: string;
    user: AuthUser;
  };
  
  const TOKEN_KEY = "wellbeing_token";
  const USER_KEY = "wellbeing_user";
  
  export function setAuthSession(data: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  
  export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  
  export function getAuthUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
  
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
  
  export function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  
  export function isAuthenticated(): boolean {
    return !!getAuthToken();
  }