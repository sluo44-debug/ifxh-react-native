import { request } from "./client";
import type {
  ApprovePitchingSoResponseDto,
  CancelOrderResponseDto,
  ConfirmActionResponseDto,
  CreateOrderRequestDto,
  OrderDetailDto,
  OrderResponseDto,
  OrderSummaryDto,
  PairCatchingSoResponseDto,
  SearchCond,
  TraderApproveRequestDto,
  TraderApproveResponseDto,
} from "./dtos/orders";

// ---------- Compatibility exports (older screens import these from ./orders) ----------
// Prefer importing from src/api/bu.ts and src/api/dtos/bu.ts going forward.
export { fetchRecipientDetails } from "./bu";
export type { RecipientDetailDto as RecipientDetail } from "./dtos/bu";

// ---------- Core existing endpoints ----------

/**
 * POST /api/orders
 * Creates a Pending order (Status "1") server-side.
 */
export async function createOrder(dto: CreateOrderRequestDto): Promise<OrderResponseDto> {
  return await request<OrderResponseDto>("POST", "/api/orders", { data: dto });
}

/**
 * GET /api/orders/bu/sender?searchCond=...
 * BU Sent list
 */
export async function listBuSentOrders(searchCond: SearchCond = "Today"): Promise<OrderSummaryDto[]> {
  const q = new URLSearchParams({ searchCond }).toString();
  return await request<OrderSummaryDto[]>("GET", `/api/orders/bu/sender?${q}`);
}

/**
 * GET /api/orders/bu/recipient?searchCond=...
 * BU Received list
 */
export async function listBuReceivedOrders(searchCond: SearchCond = "Today"): Promise<OrderSummaryDto[]> {
  const q = new URLSearchParams({ searchCond }).toString();
  return await request<OrderSummaryDto[]>("GET", `/api/orders/bu/recipient?${q}`);
}

/**
 * GET /api/orders/{orderId}
 * Order detail
 * https://api.example.com/api/orders/546
 */
export async function getOrderDetail(orderId: string): Promise<OrderDetailDto> {
  return await request<OrderDetailDto>("GET", `/api/orders/${encodeURIComponent(orderId)}`);
}

/**
 * POST /api/orders/{orderId}/cancel
 * BU Cancel (Status -> "10") - already implemented in backend
 */
export async function cancelOrder(orderId: string): Promise<CancelOrderResponseDto> {
  return await request<CancelOrderResponseDto>("POST", `/api/orders/${encodeURIComponent(orderId)}/cancel`);
}

// ---------- Workflow endpoints (need backend additions) ----------

/**
 * GET /api/orders/so/sender?searchCond=...
 * SO "sent" list (often pitching side)
 */
export async function listSoSentOrders(searchCond: SearchCond = "Today"): Promise<OrderSummaryDto[]> {
  const q = new URLSearchParams({ searchCond }).toString();
  return await request<OrderSummaryDto[]>("GET", `/api/orders/so/sender?${q}`);
}

/**
 * GET /api/orders/so/recipient?searchCond=...
 * SO "received" list (often catching side)
 */
export async function listSoReceivedOrders(searchCond: SearchCond = "Today"): Promise<OrderSummaryDto[]> {
  const q = new URLSearchParams({ searchCond }).toString();
  return await request<OrderSummaryDto[]>("GET", `/api/orders/so/recipient?${q}`);
}

/**
 * GET /api/orders/trader?searchCond=...
 * Trader queue list
 */
export async function listTraderQueue(searchCond: SearchCond = "Today"): Promise<OrderSummaryDto[]> {
  const q = new URLSearchParams({ searchCond }).toString();
  return await request<OrderSummaryDto[]>("GET", `/api/orders/trader?${q}`);
}

/**
 * POST /api/orders/{orderId}/approve/pitching-so
 * Pitching SO approves Pending -> Approved ("11")
 */
export async function approveByPitchingSo(orderId: string): Promise<ApprovePitchingSoResponseDto> {
  return await request<ApprovePitchingSoResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/approve/pitching-so`
  );
}

/**
 * POST /api/orders/{orderId}/approve/trader
 * Trader Approve(OVN) + assign catching SO -> Open ("5")
 */
export async function approveByTraderOVN(
  orderId: string,
  dto: TraderApproveRequestDto
): Promise<TraderApproveResponseDto> {
  return await request<TraderApproveResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/approve/trader`,
    { data: dto }
  );
}

/**
 * POST /api/orders/{orderId}/pair/catching-so
 * Catching SO pairs Open -> In Progress ("7")
 */
export async function pairByCatchingSo(orderId: string): Promise<PairCatchingSoResponseDto> {
  return await request<PairCatchingSoResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/pair/catching-so`
  );
}


/**
 * POST /api/orders/{orderId}/confirm/bu/sent
 * Step 5: BU confirms sent funds to pitching SO. (In Progress(7) -> Sent Step1(12))
 */
export async function confirmBuSent(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/bu/sent`
  );
}


/**
 * POST /api/orders/{orderId}/confirm/so/receive-pitching
 * Step 6: Pitching SO confirms received funds. (Sent Step1(12) -> Sent Step2(13))
 */
export async function confirmSoReceivePitching(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/so/receive-pitching`
  );
}

/**
 * POST /api/orders/{orderId}/confirm/so/sent-to-trader
 * Step 7: Pitching SO confirms sent funds to Trader. (Sent Step2(13) -> Sent Step3(14))
 */
export async function confirmSoSentToTrader(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/so/sent-to-trader`
  );
}

/**
 * POST /api/orders/{orderId}/confirm/so/receive-catching
 * Step 9: Catching SO confirms received from trader. (Sent Step4(15) -> Sent Step5(22))
 */
export async function confirmSoReceiveCatching(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/so/receive-catching`
  );
}

/**
 * POST /api/orders/{orderId}/confirm/so/sent-to-bu
 * Step 10: Catching SO confirms sent to receiver BU. (Sent Step5(22) -> Sent Step6(23))
 */
export async function confirmSoSentToBu(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/so/sent-to-bu`
  );
}

/**
 * POST /api/orders/{orderId}/confirm/bu/receive
 * Step 11: Receiver BU confirms received and order becomes Filled. (Sent Step6(23) -> Filled(9))
 */
export async function confirmBuReceive(orderId: string): Promise<ConfirmActionResponseDto> {
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/bu/receive`
  );
}


export async function confirmTraderSent(orderId: string): Promise<ConfirmActionResponseDto> {
  // Step 8: Trader confirm sent -> Sent Step4 (15)
  return await request<ConfirmActionResponseDto>(
    "POST",
    `/api/orders/${encodeURIComponent(orderId)}/confirm/trader/sent`
  );
}

