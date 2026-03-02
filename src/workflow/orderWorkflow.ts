// Centralized status/action mapping for IFXH mobile workflow.
// Keep this small so confirm/approve steps (1-11) don't duplicate magic numbers.

export const STATUS_PENDING = "1";
export const STATUS_OPEN = "6";
export const STATUS_IN_PROGRESS = "7";
export const STATUS_APPROVED = "11";

// Part B (Steps 5-11) status ids (from Project/web + Order Flow.xlsx)
export const STATUS_SENT_STEP1 = "12"; // after BU sender confirm sent
export const STATUS_SENT_STEP2 = "13"; // after pitching SO confirm received
export const STATUS_SENT_STEP3 = "14"; // after pitching SO confirm sent to trader
export const STATUS_SENT_STEP4 = "15"; // after trader confirm sent to catching SO
export const STATUS_SENT_STEP5 = "22"; // after catching SO confirm received
export const STATUS_SENT_STEP6 = "23"; // after catching SO confirm sent to receiver BU
export const STATUS_FILLED = "9";      // after receiver BU confirm received

// --------- Button gating helpers (role-specific) ---------

/**
 * SO role context from the SO dashboard merge:
 * - "sender"    => pitching SO (SO who sent the order to Trader)
 * - "recipient" => catching SO (SO who receives from Trader)
 */
export type SoRoleContext = "sender" | "recipient" | null | undefined;

/** Step 5: BU sender can Confirm Sent when status is In Progress (7). */
export function canBuConfirmSent(latestStatusId: string | null | undefined): boolean {
  return String(latestStatusId ?? "") === STATUS_IN_PROGRESS;
}

/**
 * Step 6 & 9: SO can Confirm Receive
 * - Status 12 => pitching SO only (soRole="sender")
 * - Status 15 => catching SO only (soRole="recipient")
 */
export function canSoConfirmReceive(
  latestStatusId: string | null | undefined,
  soRole: SoRoleContext
): boolean {
  const s = String(latestStatusId ?? "");
  if (s === STATUS_SENT_STEP1) return soRole === "sender";
  if (s === STATUS_SENT_STEP4) return soRole === "recipient";
  return false;
}

/**
 * Step 7 & 10: SO can Confirm Sent
 * - Status 13 => pitching SO only (soRole="sender")
 * - Status 22 => catching SO only (soRole="recipient")
 */
export function canSoConfirmSent(
  latestStatusId: string | null | undefined,
  soRole: SoRoleContext
): boolean {
  const s = String(latestStatusId ?? "");
  if (s === STATUS_SENT_STEP2) return soRole === "sender";
  if (s === STATUS_SENT_STEP5) return soRole === "recipient";
  return false;
}

/** Step 8: Trader can Confirm Sent when status is Sent Step3 (14). */
export function canTraderConfirmSent(latestStatusId: string | null | undefined): boolean {
  return String(latestStatusId ?? "") === STATUS_SENT_STEP3;
}

/** Step 11: Receiver BU can Confirm Receive when status is Sent Step6 (23). */
export function canBuConfirmReceive(latestStatusId: string | null | undefined): boolean {
  return String(latestStatusId ?? "") === STATUS_SENT_STEP6;
}
