/**
 * Lightweight debug logger for IFXH Mobile.
 *
 * Goal: help you trace API calls, status transitions, and list refresh triggers
 * without spamming production builds.
 *
 * Rules:
 * - Logs only in __DEV__ by default.
 * - You can force-enable logs in production builds by setting:
 *   EXPO_PUBLIC_DEBUG_LOGS=1
 */
type AnyObj = Record<string, any>;

const forceEnabled = (process.env.EXPO_PUBLIC_DEBUG_LOGS ?? "").trim() === "1";

function isEnabled(): boolean {
  // __DEV__ is defined by React Native/Metro
  // eslint-disable-next-line no-undef
  return (typeof __DEV__ !== "undefined" && __DEV__) || forceEnabled;
}

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function log(tag: string, data?: AnyObj) {
  if (!isEnabled()) return;
  if (data) console.log(`[IFXH][${ts()}] ${tag}`, data);
  else console.log(`[IFXH][${ts()}] ${tag}`);
}

export function logApiStart(method: string, url: string, data?: AnyObj) {
  log(`API → ${method} ${url}`, data);
}

export function logApiOk(method: string, url: string, status?: number) {
  log(`API ✓ ${method} ${url}`, { status });
}

export function logApiFail(method: string, url: string, status?: number, message?: string, details?: AnyObj) {
  log(`API ✗ ${method} ${url}`, { status, message, ...details });
}

export function logRefresh(screen: string, trigger: string, extra?: AnyObj) {
  log(`REFRESH ${screen} (${trigger})`, extra);
}

export function logTransition(action: string, fromStatusId: string | undefined, toStatusId: string | undefined, orderId?: string) {
  log(`STATUS ${action}`, { orderId, fromStatusId, toStatusId });
}
