// Typed DTOs matching IFXH_Project.Api.Controllers.OrdersController responses (anonymous objects + DTOs)
// and workflow actions discovered in Phase 1.

export type SearchCond = "Today" | "Weekly" | "10 Days" | "Monthly" | "All";

// Matches IFXH_Project.Api.DTOs.CreateOrderRequestDto
export interface CreateOrderRequestDto {
  recipientBUID: string;
  amount: string; // backend uses string for Amount/Rate (DB string)
  senderCurrency: string;
  receiverCurrency: string;
  orderDate: string; // "yyyy-MM-dd" or ISO; backend parses flexibly
  purpose?: string; // optional; if omitted backend may default (e.g. "Mobile")
}

// Matches IFXH_Project.Api.DTOs.OrderResponseDto
export interface OrderResponseDto {
  orderId: string;
  status: string;
}

export interface OrderSummaryDto {
  orderId: string;
  orderDate: string; // "yyyy-MM-dd"
  amount: string;
  rate: string;
  status: string;
  latestStatusId: string;

  // Optional flags (only some endpoints include these)
  canCancel?: boolean;

  senderCompany?: string;
  senderCurrency?: string;
  recipientCompany?: string;
  recipientCurrency?: string;

  senderCountry?: string;
  recipientCountry?: string;
}

export interface OrderDetailDto {
  orderId: string;
  orderDate: string; // "yyyy-MM-dd HH:mm:ss"
  updateTime: string;
  status: string;
  latestStatusId: string;
  rate: string;
  amount: string;
  purpose: string;

  senderCountry: string;
  senderCompany: string;
  senderCurrency: string;

  recipientCountry: string;
  recipientCompany: string;
  recipientCurrency: string;

  // These are not currently returned by GET /api/orders/{id} but exist in Data/Order.cs.
  senderBUID?: string;
  recipientBUID?: string;
  recipientCountryId?: string;
  senderCountryId?: string;

  senderSOCompany?: string;
  recipientSOCompany?: string;
  senderPR?: string;
  recipientPR?: string;
}

export interface CancelOrderResponseDto {
  status: "cancelled" | string;
  orderId: string;
}

// Workflow actions (need backend endpoints; see Phase 1)
export interface ApprovePitchingSoResponseDto {
  status: string;
  orderId: string;
}

export interface PairCatchingSoResponseDto {
  status: string;
  orderId: string;
}

export interface TraderApproveRequestDto {
  recipientSOID: string;
}

export interface TraderApproveResponseDto {
  status: string;
  orderId: string;
}


// Generic response shape for confirm/transition endpoints (Steps 5-11)
export interface ConfirmActionResponseDto {
  status: string;
  orderId: string;
}
