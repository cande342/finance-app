import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Installment } from '../../../interfaces/Installment';
import { FinanceService } from '../../../services/finance.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cuotas',
  imports: [CommonModule, FormsModule],
  templateUrl: './cuotas.component.html',
  styleUrl: './cuotas.component.scss',
})
export class CuotasComponent {

  installments$: Observable<Installment[]>;

  instItem = ''; 
  instTotal = 0; 
  instAmount = 0;
  instTotalAmount = 0;
  instInputMode: 'total' | 'cuota' = 'total';
  showInstallmentForm = false;

  private financeService = inject(FinanceService);

  constructor() {
    this.installments$ = this.financeService.getInstallments();
  }

  calculateAmountPerCuota() {
    if (this.instTotalAmount > 0 && this.instTotal > 0) {
      this.instAmount = Math.round(this.instTotalAmount / this.instTotal);
    }
  }

  calculateTotalAmount() {
    if (this.instAmount > 0 && this.instTotal > 0) {
      this.instTotalAmount = this.instAmount * this.instTotal;
    }
  }

  getCalculatedCuota(): number {
    if (this.instTotalAmount > 0 && this.instTotal > 0) {
      return Math.round(this.instTotalAmount / this.instTotal);
    }
    return 0;
  }

  getCalculatedTotal(): number {
    if (this.instAmount > 0 && this.instTotal > 0) {
      return this.instAmount * this.instTotal;
    }
    return 0;
  }

  canSaveInstallment(): boolean {
    return !!(
      this.instItem &&
      this.instTotal > 0 &&
      this.instAmount > 0 &&
      this.instTotalAmount > 0
    );
  }

  getRemainingAmount(installment: Installment): number {
    const remaining = installment.totalCuotas - installment.paidCuotas;
    return remaining * installment.amountPerCuota;
  }

  async addInstallment() {
    if (!this.canSaveInstallment()) return;

    if (this.instInputMode === 'total') {
      this.calculateAmountPerCuota();
    } else {
      this.calculateTotalAmount();
    }

    await this.financeService.addInstallment({
      item: this.instItem,
      totalCuotas: this.instTotal,
      paidCuotas: 0,
      amountPerCuota: this.instAmount,
      totalAmount: this.instTotalAmount,
      createdAt: new Date()
    });

    this.resetInstallmentForm();
  }

  payOne(i: Installment) {
    if (i.paidCuotas < i.totalCuotas) {
      this.financeService.payInstallment(i.id!, i.paidCuotas, i.totalCuotas);
    }
  }

  async deleteInstallment(id: string) {
    if (confirm('¿Seguro que quieres eliminar esta compra en cuotas?')) {
      await this.financeService.deleteInstallment(id);
    }
  }

  resetInstallmentForm() {
    this.instItem = '';
    this.instTotal = 0;
    this.instAmount = 0;
    this.instTotalAmount = 0;
    this.showInstallmentForm = false;
  }



}
