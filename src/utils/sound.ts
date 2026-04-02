const STORAGE_KEY = 'kardaoke-muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted: boolean;

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === 'true';
  }

  get muted() {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
    localStorage.setItem(STORAGE_KEY, String(val));
  }

  private getCtx(): AudioContext | null {
    if (this._muted) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  cardDraw() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }
}

export const soundEngine = new SoundEngine();
