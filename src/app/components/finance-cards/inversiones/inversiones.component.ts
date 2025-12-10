import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InvestmentCard } from '../../../interfaces/Investment';
import { FinanceService } from '../../../services/finance.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inversiones',
  imports: [CommonModule, FormsModule],
  templateUrl: './inversiones.component.html',
  styleUrl: './inversiones.component.scss',
})
export class InversionesComponent {
  
  investments$: Observable<InvestmentCard[]>;

  platform = '';
  asset = '';
  investedAmount: number | null = null;
  currentValue: number | null = null;

  editingId: string | null = null;
  editInvestedAmount: number | null = null;
  editCurrentValue: number | null = null;

  private financeService = inject(FinanceService);

  constructor() {
    this.investments$ = this.financeService.getInvestments();
  }

  async addInvestment() {
    if (!this.investedAmount) return;

    await this.financeService.addInvestment({
      platform: this.platform,
      asset: this.asset,
      investedAmount: this.investedAmount,
      currentValue: this.currentValue ?? this.investedAmount,
      createdAt: new Date(),
    });

    this.platform = '';
    this.asset = '';
    this.investedAmount = null;
    this.currentValue = null;
  }

  startEdit(inv: InvestmentCard) {
    this.editingId = inv.id!;
    this.editInvestedAmount = inv.investedAmount;
    this.editCurrentValue = inv.currentValue;
  }

  async saveEdit() {
    if (!this.editingId) return;

    await this.financeService.updateInvestment(this.editingId, {
      investedAmount: this.editInvestedAmount,
      currentValue: this.editCurrentValue,
    });

    this.editingId = null;
  }

  cancelEdit() {
    this.editingId = null;
  }
}
