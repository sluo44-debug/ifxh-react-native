import { request } from "./client";
import type { AccountBalanceDto, AccountTransactionDto } from "./dtos/account";

/**
 * GET /api/account/balances
 * Returns multi-currency wallet balances.
 */
export async function getAccountBalances(): Promise<AccountBalanceDto[]> {
  return await request<AccountBalanceDto[]>("GET", "/api/account/balances");
}

/**
 * GET /api/account/transactions/{currency}
 * Returns completed transactions for a currency.
 */
export async function getAccountTransactions(currency: string): Promise<AccountTransactionDto[]> {
  const cur = (currency ?? "").trim();
  return await request<AccountTransactionDto[]>(
    "GET",
    `/api/account/transactions/${encodeURIComponent(cur)}`
  );
}
