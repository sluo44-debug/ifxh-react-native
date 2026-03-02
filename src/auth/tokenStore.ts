import AsyncStorage from "@react-native-async-storage/async-storage";

// Refresh token storage for React Native.
// - Access token stays in memory (AuthContext + api client)
// - Refresh token is persisted so the app can refresh after access expiry.

const REFRESH_KEY = "ifxh.refreshToken";

export async function getRefreshToken(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(REFRESH_KEY);
    return v || null;
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string | null): Promise<void> {
  try {
    if (!token) {
      await AsyncStorage.removeItem(REFRESH_KEY);
      return;
    }
    await AsyncStorage.setItem(REFRESH_KEY, token);
  } catch {
    // best-effort
  }
}