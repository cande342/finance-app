import { Component, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative h-screen w-full flex items-center justify-center overflow-hidden bg-slate-900">
      
      <div class="absolute inset-0 z-0">
        <img src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/DrMundo_3.jpg" 
             alt="Dr Mundo Ejecutivo" 
             class="w-full h-full object-cover animate-slow-zoom brightness-75">
        
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-purple-900/20"></div>
      </div>

      <div class="relative z-10 w-full max-w-md p-8 m-4 bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center transform transition-all hover:scale-[1.01] duration-300">
        
        <div class="mx-auto w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-900/50 ring-4 ring-white/10">
          <span class="text-4xl filter drop-shadow-md">📞</span>
        </div>

        <h1 class="text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
          Mundo Corp.
        </h1>
        <p class="text-slate-200 mb-8 text-lg font-medium italic">
          "Mundo maneja las finanzas como quiere."
        </p>

        <button (click)="login()" 
                class="w-full group relative flex items-center justify-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all shadow-xl hover:shadow-green-500/20 active:scale-95 border-b-4 border-slate-300 hover:border-slate-400">
          
          <svg class="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          
          <span>Entrar a la Oficina</span>
        </button>

        <div class="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <span>SISTEMA FINANCIERO V1</span>
          <span class="opacity-60">MUNDO VA A DONDE QUIERE</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slow-zoom {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .animate-slow-zoom {
      animation: slow-zoom 30s infinite ease-in-out;
    }
  `]
})
export class LoginComponent {
  private auth = inject(Auth);
  private router = inject(Router);

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      this.router.navigate(['/app/dashboard']);
    } catch (error) {
      console.error('Login falló:', error);
    }
  }
}