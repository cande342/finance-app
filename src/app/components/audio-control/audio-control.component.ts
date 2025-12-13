import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-audio-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105 group">
      
      <button (click)="toggle()" class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl shadow-lg hover:bg-indigo-500 transition-colors">
        {{ isPlaying ? '⏸️' : '▶️' }}
      </button>

      <div class="flex items-center gap-2 overflow-hidden w-0 group-hover:w-32 transition-all duration-500 ease-in-out">
        <span class="text-xs text-slate-400">🔈</span>
        <input type="range" min="0" max="100" [(ngModel)]="volume" (input)="updateVolume()"
               class="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500">
        <span class="text-xs text-slate-400">🔊</span>
      </div>

      <div *ngIf="isPlaying" class="absolute -top-8 right-0 bg-indigo-600 text-[10px] px-2 py-1 rounded-md animate-bounce uppercase font-bold tracking-tighter text-white">
        Mundo Radio
      </div>
    </div>
  `
})
export class AudioControlComponent {
  private audioService = inject(AudioService);
  isPlaying = false;
  volume = 50;

  toggle() {
    this.isPlaying = this.audioService.toggleAudio();
  }

  updateVolume() {
    this.audioService.setVolume(this.volume);
  }
}