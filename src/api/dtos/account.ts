export type AccountBalanceDto = {
  currency: string;
  amount: string;
  currencyName: string;
};

export type AccountTransactionDto = {
  createdAt: string;
  completedAt: string;
  action: string;
  amount: string;
  balanceAmount: string;
};
