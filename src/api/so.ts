import { request } from "./client";
import type { SoRecipientOptionDto } from "./dtos/so";

/**
 * Backend endpoint required:
 * GET /api/so/recipient-options?recipientCountryId=...&recipientBuid=...
 * Returns list of eligible catching SOs for the Trader step.
 */
export async function fetchEligibleCatchingSOs(params: {
  recipientCountryId: string;
  recipientBuid: string;
}): Promise<SoRecipientOptionDto[]> {
  const q = new URLSearchParams({
    recipientCountryId: params.recipientCountryId,
    recipientBuid: params.recipientBuid,
  }).toString();
  return await request<SoRecipientOptionDto[]>("GET", `/api/so/recipient-options?${q}`);
}
