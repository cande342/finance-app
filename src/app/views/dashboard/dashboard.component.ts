import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../services/finance.service';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Transaction } from '../../interfaces/Transaction';
import { Installment } from '../../interfaces/Installment';
import { InvestmentCard } from '../../interfaces/Investment';
import { HeaderComponent } from '../../components/header/header.component';
import { TransactionsTableComponent } from '../../components/transactions-table/transactions-table.component';
import { IngresoComponent } from '../../components/finance-cards/ingreso/ingreso.component';
import { CuotasComponent } from '../../components/finance-cards/cuotas/cuotas.component';
import { InversionesComponent } from '../../components/finance-cards/inversiones/inversiones.component';


type ModalId = 'ingreso' | 'cuotas' | 'inversiones' | null;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    HeaderComponent, 
    TransactionsTableComponent, 
    IngresoComponent, 
    CuotasComponent, 
    InversionesComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private financeService = inject(FinanceService);


  activeModal: ModalId = null;
  isSyncing = false;

  // Observables
  transactions$: Observable<Transaction[]>;
  installments$: Observable<Installment[]>;
  investments$: Observable<InvestmentCard[]>;
  
  // Variable "Alerta de Gastos"
  totalExpense = 0;

  // Forms Models (Ingreso/Gasto)
  newType: 'ingreso' | 'gasto' = 'gasto';
  amount: number | null = null;
  desc: string = '';
  category: string = 'ocio';

  // Cuotas Models
  instItem = ''; 
  instTotal = 0; 
  instAmount = 0;

  // Inversión Models
  invPlatform = ''; 
  invAsset = ''; 
  invAmount: number | null = null;

  constructor() {
    this.transactions$ = this.financeService.getTransactions();
    this.installments$ = this.financeService.getInstallments();
    this.investments$ = this.financeService.getInvestments();

    // Calcular total gastos para la alerta
    this.transactions$.subscribe(data => {
      this.totalExpense = data
        .filter(t => t.type === 'gasto')
        .reduce((acc, curr) => acc + curr.amount, 0);
    });
  }

  // --- LÓGICA DE SINCRONIZACIÓN ---
  onSyncMP() {
    this.isSyncing = true; //
    
    this.financeService.syncMercadoPago().subscribe({
      next: (res) => {
        alert(res.message); // Muestra cuántos movimientos nuevos se cargaron
        this.isSyncing = false; //
      },
      error: (err) => {
        console.error('Error en sync:', err);
        alert('Hubo un error al conectar con Mercado Pago');
        this.isSyncing = false; //
      }
    });
  }

  // --- GESTIÓN DE MODALES ---

  openModal(id: ModalId) {
    this.activeModal = id;
  }

  closeModal() {
    this.activeModal = null;
    this.resetForms(); // Limpia los datos al cerrar
  }

  toggleModal(id: ModalId) {
    if (this.activeModal === id) {
      // Si ya está abierto, lo cerramos
      this.closeModal();
    } else {
      // Si no, lo abrimos
      this.activeModal = id;
    }
  }

  private resetForms() {
    this.amount = null;
    this.desc = '';
    this.instItem = '';
    this.instTotal = 0;
    this.instAmount = 0;
    this.invPlatform = '';
    this.invAsset = '';
    this.invAmount = null;
  }

  // --- LÓGICA DE NEGOCIO ---

  async addTransaction() {
    if (!this.amount) return;
    await this.financeService.addTransaction({
      type: this.newType,
      amount: this.amount,
      description: this.desc || 'Sin descripción',
      category: this.category,
      date: new Date()
    });
    this.closeModal(); // Cierra el modal tras guardar
  }

  async addInstallment() {
    if (!this.instItem || this.instTotal <= 0 || this.instAmount <= 0) return;
    
    const totalAmount = this.instAmount * this.instTotal;
    
    await this.financeService.addInstallment({
      item: this.instItem,
      totalCuotas: this.instTotal,
      paidCuotas: 0,
      totalAmount: totalAmount,
      amountPerCuota: this.instAmount,
      createdAt: new Date()
    });
    this.closeModal(); // Cierra el modal tras guardar
  }

  payOne(i: Installment) {
    this.financeService.payInstallment(i.id!, i.paidCuotas, i.totalCuotas);
  }

  async addInvestment() {
    if (!this.invAmount) return;

    await this.financeService.addInvestment({
      platform: this.invPlatform,
      asset: this.invAsset,
      investedAmount: this.invAmount,
      currentValue: this.invAmount, 
      createdAt: new Date()
    });

    this.closeModal();
  }

}