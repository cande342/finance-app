import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, Chart, registerables } from 'chart.js';
import { combineLatest } from 'rxjs';
import { FinanceService } from '../../services/finance.service';
import { GeminiService } from '../../services/gemini.service';

// Interfaces
import { Transaction } from '../../interfaces/Transaction';
import { InvestmentCard } from '../../interfaces/Investment';
import { Installment } from '../../interfaces/Installment';

// Registrar componentes de Chart.js
Chart.register(...registerables);

interface UIAdviceState {
  loading: boolean;
  error?: string;
  mainAdvice?: string;
  tips?: string[];
  priority?: 'success' | 'warning' | 'danger';
  savingsRate?: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private geminiService = inject(GeminiService);

  // --- KPIs Principales ---
  totalIncome = 0;
  totalExpense = 0;
  currentBalance = 0;
  totalInvested = 0;
  pendingDebt = 0;

  // --- Estado UI Gemini ---
  showKeyModal = false;
  tempApiKey = '';
  keyError = '';
  uiAdvice: UIAdviceState = { loading: false };

  // --- Data Cruda para Gemini ---
  private rawDataForAI: any = {};
  private historyForAI: any[] = [];

  // ==========================================
  // CONFIGURACIÓN DE GRÁFICOS
  // ==========================================

  // 1. DOUGHNUT: Categorías
  public doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { font: { family: 'Inter', size: 12 } } },
      tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)' }
    }
  };
  
  public categoryChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 4
    }]
  };

  // 2. BAR: Historial Mensual
  public barOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#f3f4f6' } }
    }
  };

  public historyChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { label: 'Ingresos', data: [], backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Gastos', data: [], backgroundColor: '#ef4444', borderRadius: 4 }
    ]
  };

  // ==========================================
  // LÓGICA DE INICIALIZACIÓN
  // ==========================================

  ngOnInit() {
    console.log('🔄 Analytics: Suscribiendo a flujos de datos...');

    // Escuchamos las 3 fuentes simultáneamente
    combineLatest([
      this.financeService.getTransactions(),
      this.financeService.getInvestments(),
      this.financeService.getInstallments()
    ]).subscribe({
      next: ([transactions, investments, installments]) => {
        console.log('✅ Datos recibidos:', { 
          t: transactions.length, 
          i: investments.length, 
          c: installments.length 
        });
        
        this.processFinancialData(transactions, investments, installments);
      },
      error: (err) => console.error('❌ Error cargando datos:', err)
    });
  }

  processFinancialData(transactions: Transaction[], investments: InvestmentCard[], installments: Installment[]) {
    // 1. Reiniciar KPIs
    this.totalIncome = 0;
    this.totalExpense = 0;
    this.totalInvested = 0;
    this.pendingDebt = 0;
    
    const categoriesMap: { [key: string]: number } = {};
    const monthlyHistory: { [key: string]: { income: number, expense: number } } = {};

    // 2. Procesar Transacciones
    transactions.forEach(t => {
      // Normalizar fecha (Firebase Timestamp vs Date vs String)
      let date: Date;
      if ((t.date as any)?.toDate) {
        date = (t.date as any).toDate(); // Es Timestamp de Firebase
      } else {
        date = new Date(t.date); // Es string o Date normal
      }

      if (isNaN(date.getTime())) return; // Fecha inválida, saltar

      const amount = Number(t.amount) || 0;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

      // Inicializar mes
      if (!monthlyHistory[monthKey]) monthlyHistory[monthKey] = { income: 0, expense: 0 };

      if (t.type === 'ingreso') {
        this.totalIncome += amount;
        monthlyHistory[monthKey].income += amount;
      } else if (t.type === 'gasto') {
        this.totalExpense += amount;
        monthlyHistory[monthKey].expense += amount;

        // Categorías (Solo gastos)
        const cat = t.category || 'Otros';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + amount;
      }
    });

    this.currentBalance = this.totalIncome - this.totalExpense;

    // 3. Procesar Inversiones
    investments.forEach(inv => {
      const val = Number(inv.currentValue) || Number(inv.investedAmount) || 0;
      this.totalInvested += val;
    });

    // 4. Procesar Deuda (Cuotas pendientes)
    installments.forEach(inst => {
      const total = Number(inst.totalCuotas) || 0;
      const paid = Number(inst.paidCuotas) || 0;
      const amount = Number(inst.amountPerCuota) || 0;
      
      const remaining = total - paid;
      if (remaining > 0) {
        this.pendingDebt += (remaining * amount);
      }
    });

    // 5. Actualizar Gráficos
    this.updateCharts(categoriesMap, monthlyHistory);

    // 6. Preparar datos para IA
    this.prepareAIData(categoriesMap, monthlyHistory);
  }

  updateCharts(categoriesMap: any, monthlyHistory: any) {
    // A. Chart Categorías
    this.categoryChartData.labels = Object.keys(categoriesMap);
    this.categoryChartData.datasets[0].data = Object.values(categoriesMap);
    this.categoryChartData = { ...this.categoryChartData }; // Trigger update

    // B. Chart Historia
    const sortedMonths = Object.keys(monthlyHistory).sort(); // Orden cronológico
    
    this.historyChartData.labels = sortedMonths.map(m => {
      const [year, month] = m.split('-');
      // Truco: día 2 para evitar problemas de zona horaria al restar horas
      const d = new Date(parseInt(year), parseInt(month) - 1, 2); 
      return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
    });

    this.historyChartData.datasets[0].data = sortedMonths.map(m => monthlyHistory[m].income);
    this.historyChartData.datasets[1].data = sortedMonths.map(m => monthlyHistory[m].expense);
    this.historyChartData = { ...this.historyChartData }; // Trigger update
  }

  prepareAIData(categoriesMap: any, monthlyHistory: any) {
    this.rawDataForAI = {
      income: this.totalIncome,
      expense: this.totalExpense,
      balance: this.currentBalance,
      invested: this.totalInvested,
      debt: this.pendingDebt,
      categories: categoriesMap
    };
    
    const sortedMonths = Object.keys(monthlyHistory).sort();
    this.historyForAI = sortedMonths.slice(-6).map(m => ({
      period: m,
      ...monthlyHistory[m]
    }));
  }

  // ==========================================
  // LÓGICA GEMINI AI
  // ==========================================

  openKeyModal() {
    this.showKeyModal = true;
    this.keyError = '';
  }

  saveKey() {
    if (!this.tempApiKey) return;
    this.geminiService.setApiKey(this.tempApiKey);
    this.showKeyModal = false;
    this.generateAIAdvice();
  }

  async generateAIAdvice() {
    this.uiAdvice = { loading: true };
    this.keyError = '';

    try {
      // Creamos un contexto enriquecido para pasarle al prompt
      const context = `
        [CONTEXTO ADICIONAL]:
        - Patrimonio Invertido: $${this.totalInvested}
        - Deuda Total Restante (Cuotas): $${this.pendingDebt}
        - Tendencia últimos meses: ${JSON.stringify(this.historyForAI)}
      `;

      // Engañamos al método analyzeFinances pasando el contexto en categories
      // (Para no romper la interfaz del servicio si no la cambiaste)
      const enrichedCategories = {
        ...this.rawDataForAI.categories,
        _RESUMEN_PATRIMONIAL: context
      };

      const result = await this.geminiService.analyzeFinances(
        this.rawDataForAI.income,
        this.rawDataForAI.expense,
        enrichedCategories,
        this.historyForAI
      );

      const savingsRate = this.totalIncome > 0 
        ? ((this.totalIncome - this.totalExpense) / this.totalIncome) * 100 
        : 0;

      let priority: 'success' | 'warning' | 'danger' = 'success';
      if (savingsRate < 0) priority = 'danger';
      else if (savingsRate < 10) priority = 'warning';

      this.uiAdvice = {
        loading: false,
        mainAdvice: result.analysis,
        tips: [result.tip],
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        priority: priority
      };

    } catch (error: any) {
      console.error(error);
      const msg = error.message || '';
      if (msg.includes('MISSING_API_KEY')) {
        this.uiAdvice = { loading: false, error: 'Falta configurar tu API Key.' };
        this.showKeyModal = true;
      } else if (msg.includes('INVALID_API_KEY')) {
        this.uiAdvice = { loading: false, error: 'API Key inválida.' };
        this.geminiService.removeKey();
        this.showKeyModal = true;
      } else {
        this.uiAdvice = { loading: false, error: 'Error de conexión con la IA.' };
      }
    }
  }
}