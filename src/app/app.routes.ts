import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './views/dashboard/dashboard.component';
import { authGuard } from './auth.guard'; 
import { AnalyticsComponent } from './views/analytics/analytics.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'app', 
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent }, // Ingresos, Gastos, Cuotas
      { path: 'analytics', component: AnalyticsComponent }  // Gráficos y Análisis
    ]
  }
];