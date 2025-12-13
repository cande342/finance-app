import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../services/finance.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Transaction } from '../../interfaces/Transaction';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions-table.component.html',
  styleUrl: './transactions-table.component.scss'
})
export class TransactionsTableComponent implements OnInit {
  private financeService = inject(FinanceService);

  // Expone Math al template
  Math = Math;

  transactions$!: Observable<Transaction[]>;
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // Filtros
  filterType: 'all' | 'ingreso' | 'gasto' | 'inversion' = 'all';
  searchTerm = '';
  
  // Ordenamiento
  sortBy: 'date' | 'amount' | 'category' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  ngOnInit() {
    this.transactions$ = this.financeService.getAllMovements();
    
    this.transactions$.subscribe(transactions => {
      this.applyFiltersAndSort(transactions);
    });
  }

  /**
   * Aplica filtros, búsqueda, ordenamiento y paginación
   */
  applyFiltersAndSort(transactions: Transaction[]) {
    let filtered = [...transactions];

    // 1. Filtrar por tipo
    if (this.filterType !== 'all') {
      filtered = filtered.filter(t => t.type === this.filterType);
    }

    // 2. Búsqueda por descripción o categoría
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
      );
    }

    // 3. Ordenar
    filtered = this.sortTransactions(filtered);

    // 4. Guardar filtrados
    this.filteredTransactions = filtered;

    // 5. Calcular paginación
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    
    // Ajustar página si se sale del rango
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // 6. Paginar
    this.updatePaginatedTransactions();
  }

  /**
   * Ordena las transacciones según el criterio seleccionado
   */
  sortTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'date':
          const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
          const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
          comparison = dateA - dateB;
          break;

        case 'amount':
          comparison = a.amount - b.amount;
          break;

        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Actualiza la vista paginada
   */
  updatePaginatedTransactions() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedTransactions = this.filteredTransactions.slice(start, end);
  }

  /**
   * Cambia de página
   */
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTransactions();
    }
  }

  /**
   * Cambia el filtro de tipo
   */
  changeFilter(type: 'all' | 'ingreso' | 'gasto' | 'inversion') {
    this.filterType = type;
    this.currentPage = 1;
    this.transactions$.subscribe(t => this.applyFiltersAndSort(t));
  }

  /**
   * Ejecuta búsqueda
   */
  onSearch() {
    this.currentPage = 1;
    this.transactions$.subscribe(t => this.applyFiltersAndSort(t));
  }

  /**
   * Cambia ordenamiento
   */
  changeSort(sortBy: 'date' | 'amount' | 'category') {
    if (this.sortBy === sortBy) {
      // Toggle orden
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.transactions$.subscribe(t => this.applyFiltersAndSort(t));
  }

  /**
   * Obtiene el rango de páginas a mostrar
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (this.currentPage >= this.totalPages - 2) {
        for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  }

  /**
   * TrackBy para optimizar rendering
   */
  trackByTransactionId(index: number, item: Transaction): string {
    return item.id || index.toString();
  }
}