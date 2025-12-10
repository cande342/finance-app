export interface InvestmentCard {
  id?: string;
  platform: string;
  asset: string;
  investedAmount: number | null;
  currentValue: number | null;
  createdAt: any;
}
