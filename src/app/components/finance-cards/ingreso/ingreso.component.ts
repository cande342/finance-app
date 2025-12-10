import { Component, inject } from '@angular/core';
import { FinanceService } from '../../../services/finance.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {NgModule} from '@angular/core';

@Component({
  selector: 'app-ingreso',
  imports: [CommonModule, FormsModule],
  templateUrl: './ingreso.component.html',
  styleUrl: './ingreso.component.scss',
})
export class IngresoComponent {

  newType: 'ingreso' | 'gasto' = 'gasto';
  amount: number | null = null;
  desc: string = '';
  category: string = 'ocio';
  totalExpense = 0;

  private financeService = inject(FinanceService);

  constructor() {
    this.financeService.getTransactions().subscribe(data => {
      this.totalExpense = data
        .filter(t => t.type === 'gasto')
        .reduce((acc, curr) => acc + curr.amount, 0);
    });
  }

  async addTransaction() {
  if (!this.amount) return;
  await this.financeService.addTransaction({
    type: this.newType,
    amount: this.amount,
    description: this.desc || 'Sin descripción',
    category: this.category,
    date: new Date()
  });
  this.amount = null; 
  this.desc = '';
}

}
