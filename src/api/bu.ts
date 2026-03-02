import { request } from "./client";
import type { BuMeDto, RecipientOptionDto, RecipientDetailDto } from "./dtos/bu";

export async function fetchBuMe(): Promise<BuMeDto> {
  return await request<BuMeDto>("GET", "/api/bu/me");
}

export async function fetchRecipientOptions(): Promise<RecipientOptionDto[]> {
  return await request<RecipientOptionDto[]>("GET", "/api/bu/recipients");
}

export async function fetchRecipientDetails(): Promise<RecipientDetailDto[]> {
  return await request<RecipientDetailDto[]>("GET", "/api/bu/recipients/details");
}
