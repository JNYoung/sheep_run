export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = localStorage.getItem("sheepRun.muted") === "1";
  private musicTimer: number | null = null;

  get isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.035;
      this.musicGain.connect(this.master);
      this.startMusic();
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    localStorage.setItem("sheepRun.muted", this.muted ? "1" : "0");
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.context?.currentTime ?? 0, 0.02);
    }

    return this.muted;
  }

  click(): void {
    this.tone(740, 0.055, "triangle", 0.08);
  }

  sheep(): void {
    if (!this.context || !this.master || this.muted) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(410, now);
    oscillator.frequency.linearRampToValueAtTime(455, now + 0.08);
    oscillator.frequency.linearRampToValueAtTime(390, now + 0.22);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.34);
  }

  win(): void {
    this.sequence([523.25, 659.25, 783.99, 1046.5], 0.07, 0.1);
  }

  fail(): void {
    this.sequence([330, 246.94, 196], 0.09, 0.12, "sawtooth");
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.master || this.muted) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private sequence(notes: number[], step: number, volume: number, type: OscillatorType = "triangle"): void {
    if (!this.context || this.muted) {
      return;
    }

    notes.forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, step * 1.5, type, volume), index * step * 1000);
    });
  }

  private startMusic(): void {
    if (!this.context || !this.musicGain || this.musicTimer !== null) {
      return;
    }

    const notes = [261.63, 329.63, 392, 329.63];
    let index = 0;
    const playNote = () => {
      if (!this.context || !this.musicGain) {
        return;
      }

      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(notes[index % notes.length], now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      oscillator.connect(gain).connect(this.musicGain);
      oscillator.start(now);
      oscillator.stop(now + 0.52);
      index += 1;
    };

    playNote();
    this.musicTimer = window.setInterval(playNote, 520);
  }
}
