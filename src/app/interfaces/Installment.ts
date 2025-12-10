export interface Installment {
  id?: string;
  item: string;                   
  totalCuotas: number;             
  paidCuotas: number;             
  amountPerCuota: number;          
  totalAmount: number;             
  createdAt?: Date;                
  nextPaymentDate?: Date;          
}