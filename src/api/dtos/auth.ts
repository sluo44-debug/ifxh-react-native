
export type UserRole = "Admin" | "BU" | "SO" | "Trader" | "DSMO" | "Normal" | "Unknown";

export interface LoginRequestDto {
  email: string;
  password: string;
}

// Matches IFXH_Project.Api.DTOs.TokenResponseDto (camelCased by ASP.NET)
export interface LoginResponseDto {
  token: string;
  email: string;
  role: string;

  // Step 2 (mobile): server returns refreshToken in body (web uses HttpOnly cookie)
  refreshToken?: string | null;
}

// Matches POST /api/auth/refresh request body for mobile
export interface RefreshRequestDto {
  refreshToken?: string | null;
}

// Matches GET /api/auth/me response
export interface MeResponseDto {
  userId: string;
  email: string;
  roles: string[];
}

export function normalizeRole(role: any): UserRole {
  if (!role) return "Unknown";
  const r = String(role);
  const known: UserRole[] = ["Admin", "BU", "SO", "Trader", "DSMO", "Normal", "Unknown"];
  return (known as string[]).includes(r) ? (r as UserRole) : "Unknown";
}