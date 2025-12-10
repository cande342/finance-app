import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../../services/finance.service';
import { Observable } from 'rxjs';
import { Transaction } from '../../interfaces/Transaction';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100">
      <h3 class="text-2xl font-bold mb-6 text-gray-800">Últimos Movimientos</h3>
      
      <div *ngIf="(transactions$ | async)?.length === 0" class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-lg">No hay movimientos registrados</p>
        <p class="text-sm mt-2">Comienza agregando tu primer ingreso o gasto</p>
      </div>

      <div *ngIf="(transactions$ | async)?.length" class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-gray-500 border-b-2 border-gray-200">
              <th class="pb-3 font-semibold">Fecha</th>
              <th class="pb-3 font-semibold">Descripción</th>
              <th class="pb-3 font-semibold">Categoría</th>
              <th class="pb-3 text-right font-semibold">Monto</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let t of transactions$ | async"
                class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              
              <td class="py-4 text-gray-600 font-medium">
                {{ t.date?.toDate ? (t.date.toDate() | date:'dd/MM/yyyy') : (t.date | date:'dd/MM/yyyy') }}
              </td>

              <td class="py-4 text-gray-800">
                {{ t.description }}
              </td>

              <td class="py-4 capitalize">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold"
                      [ngClass]="{
                        'bg-green-100 text-green-700': t.type==='ingreso',
                        'bg-red-100 text-red-700': t.type==='gasto',
                        'bg-purple-100 text-purple-700': t.type==='inversion'
                      }">
                  {{ t.category }}
                </span>
              </td>

              <!-- Monto -->
              <td class="py-4 text-right font-mono font-bold text-lg"
                  [class.text-red-600]="t.type === 'gasto'"
                  [class.text-green-600]="t.type === 'ingreso'"
                  [class.text-purple-600]="t.type === 'inversion'">

                {{ t.type === 'gasto' ? '-' : '+' }}{{ t.amount | currency }}

              </td>

            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    table {
      border-collapse: separate;
      border-spacing: 0;
    }
  `]
})
export class TransactionsTableComponent {
  private financeService = inject(FinanceService);

  transactions$: Observable<Transaction[]>;

  constructor() {
    this.transactions$ = this.financeService.getAllMovements();
  }
}
