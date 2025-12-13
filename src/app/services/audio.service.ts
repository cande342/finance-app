import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audio = new Audio();
  private isPlaying = false;

  constructor() {
    this.audio.src = 'mundo-push.mp3'; 
    this.audio.loop = true;
    this.audio.volume = 0.5;
  }

  toggleAudio() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(e => console.log("Esperando interacción del usuario..."));
    }
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  setVolume(value: number) {
    this.audio.volume = value / 100;
  }

  getIsPlaying() {
    return this.isPlaying;
  }
}