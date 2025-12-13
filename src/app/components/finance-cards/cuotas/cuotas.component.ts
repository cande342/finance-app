import { Component, inject, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  @Output() close = new EventEmitter<void>();

  installments$: Observable<Installment[]>;

  instItem = ''; 
  instTotal = 0; 
  instAmount = 0;
  instTotalAmount = 0;
  instInputMode: 'total' | 'cuota' = 'total';
  showInstallmentForm = false;

  // Opciones de ordenamiento
  sortBy: 'nombre' | 'progreso' | 'pendiente' | 'fecha' = 'progreso';

  private financeService = inject(FinanceService);

  constructor() {
    this.installments$ = this.financeService.getInstallments().pipe(
      map(installments => this.sortInstallments(installments))
    );
  }

  /**
   * Ordena las cuotas según el criterio seleccionado
   */
  sortInstallments(installments: Installment[]): Installment[] {
    const sorted = [...installments];

    switch (this.sortBy) {
      case 'nombre':
        return sorted.sort((a, b) => a.item.localeCompare(b.item));
      
      case 'progreso':
        // Ordenar por progreso: las menos completadas primero
        return sorted.sort((a, b) => {
          const progressA = (a.paidCuotas / a.totalCuotas) * 100;
          const progressB = (b.paidCuotas / b.totalCuotas) * 100;
          return progressA - progressB;
        });
      
      case 'pendiente':
        // Ordenar por monto pendiente: mayor deuda primero
        return sorted.sort((a, b) => {
          const remainingA = this.getRemainingAmount(a);
          const remainingB = this.getRemainingAmount(b);
          return remainingB - remainingA;
        });
      
      case 'fecha':
        // Ordenar por fecha de creación: más reciente primero
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      
      default:
        return sorted;
    }
  }

  /**
   * Cambia el criterio de ordenamiento y refresca la lista
   */
  changeSortOrder(sortBy: 'nombre' | 'progreso' | 'pendiente' | 'fecha') {
    this.sortBy = sortBy;
    // Forzar recalculo del observable
    this.installments$ = this.financeService.getInstallments().pipe(
      map(installments => this.sortInstallments(installments))
    );
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

  getProgressPercentage(installment: Installment): number {
    return (installment.paidCuotas / installment.totalCuotas) * 100;
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

  async payOne(i: Installment) {
    if (i.paidCuotas < i.totalCuotas) {
      await this.financeService.payInstallment(i.id!, i.paidCuotas, i.totalCuotas);
      // No es necesario hacer nada más, el observable se actualiza solo
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

  trackByInstallmentId(index: number, item: Installment): string {
    return item.id || index.toString();
  }
}