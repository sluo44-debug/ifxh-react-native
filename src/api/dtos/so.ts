// DTOs for SO selection list used in Trader approve step.

export interface SoRecipientOptionDto {
  soId: string;
  companyName: string;
  countryName?: string;
  currency?: string;
}
