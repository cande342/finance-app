export interface Transaction {
  id?: string;
  date: any;
  description: string;
  category: string;
  type: "ingreso" | "gasto" | "inversion"; 
  amount: number;
}
