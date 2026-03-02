import { getAuthToken, request, setAuthToken } from "./client";
import type {
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  RefreshRequestDto,
  UserRole,
} from "./dtos/auth";
import { normalizeRole } from "./dtos/auth";
import { getRefreshToken, setRefreshToken } from "../auth/tokenStore";

export interface AuthUser {
  token: string;
  email: string;
  role: UserRole;
}

export async function login(dto: LoginRequestDto): Promise<AuthUser> {
  const res = await request<LoginResponseDto>("POST", "/api/auth/login", { data: dto });
  const user: AuthUser = {
    token: res.token,
    email: res.email,
    role: normalizeRole(res.role),
  };

  setAuthToken(user.token);

  // Step 2 (mobile): store refresh token from body (server returns it only for RN)
  await setRefreshToken(res.refreshToken ?? null);

  return user;
}

export async function fetchMe(): Promise<MeResponseDto> {
  return await request<MeResponseDto>("GET", "/api/auth/me");
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const me = await fetchMe();
    const roleStr = me.roles && me.roles.length > 0 ? me.roles[0] : "Unknown";

    // ✅ JWT world: token is NOT userId. Keep the real access token we already have.
    const token = getAuthToken();
    if (!token) return null;

    return {
      token,
      email: me.email,
      role: normalizeRole(roleStr),
    };
  } catch {
    return null;
  }
}

/**
 * Step 2 (mobile): refresh access token using stored refresh token.
 * - Sends refresh token in body (NOT cookie)
 * - Server rotates refresh token and returns a new one
 */
export async function refresh(): Promise<LoginResponseDto> {
  const rt = await getRefreshToken();
  if (!rt) throw new Error("Missing refresh token");

  const body: RefreshRequestDto = { refreshToken: rt };
  const res = await request<LoginResponseDto>("POST", "/api/auth/refresh", { data: body });

  // Update access token for future API calls
  if (res?.token) setAuthToken(res.token);

  // Rotation: persist the new refresh token
  if (res?.refreshToken) await setRefreshToken(res.refreshToken);

  return res;
}

// Step 4 (mobile/web Option B): revoke refresh token server-side (best-effort)
export async function logout(): Promise<void> {
  const rt = await getRefreshToken();
  if (!rt) return;

  try {
    const body: RefreshRequestDto = { refreshToken: rt };
    await request("POST", "/api/auth/logout", { data: body });
  } catch {
    // ignore network/server errors on logout
  }
}
