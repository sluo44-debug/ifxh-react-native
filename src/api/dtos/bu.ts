// Matches IFXH_Project.Api.DTOs.RecipientOptionDto / RecipientDetailDto and /api/bu/me response.

export interface BuMeDto {
  buid: string;
  companyName: string;
}

export interface RecipientOptionDto {
  recipientBUID: string;
  displayName: string;
}

export interface RecipientDetailDto {
  recipientBUID: string;

  recipientCountry: string;
  recipientCompany: string;

  senderCurrency: string;
  recipientCurrency: string;
  senderCountry: string;
  recipientCountryCode: string;

  currentRate: string;
  serviceRate: string;
  computedRate: string;
}
