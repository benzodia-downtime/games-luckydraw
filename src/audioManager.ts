const DEFAULT_MASTER_VOLUME = 0.6;
const STORAGE_KEY = "luckydraw-master-volume";
const WRONG_SOUND_URL = new URL("../asset/snd/no.mp3", import.meta.url).href;
const FANFARE_SOUND_URL = new URL("../asset/snd/fanfare.mp3", import.meta.url).href;
const WRONG_SOUND_START = 0.072;
const WRONG_SOUND_END = 0.353;

type Waveform = OscillatorType;
type Tone = {
  start: number;
  duration: number;
  frequency: number;
  gain: number;
  waveform: Waveform;
};

export class AudioManager {
  private context: AudioContext | null = null;
  private masterVolume = this.readStoredVolume();
  private activeAudio = new Set<HTMLAudioElement>();

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(volume: number): number {
    const normalized = Math.max(0, Math.min(1, volume));
    this.masterVolume = normalized;
    window.localStorage.setItem(STORAGE_KEY, normalized.toFixed(2));
    return normalized;
  }

  public playMiss(): void {
    this.playAudioFile(WRONG_SOUND_URL, {
      startAt: WRONG_SOUND_START,
      endAt: WRONG_SOUND_END,
    });
  }

  public playWin(): void {
    this.playAudioFile(FANFARE_SOUND_URL);
  }

  public playRestart(): void {
    void this.playSequence([
      { start: 0, duration: 0.07, frequency: 329.63, gain: 0.09, waveform: "triangle" },
      { start: 0.06, duration: 0.1, frequency: 392, gain: 0.08, waveform: "triangle" },
    ]);
  }

  private playAudioFile(url: string, options?: { startAt?: number; endAt?: number }): void {
    if (this.masterVolume <= 0) {
      return;
    }

    const sound = new Audio(url);
    sound.volume = this.masterVolume;
    sound.preload = "auto";
    let stopTimer: number | null = null;

    const cleanup = () => {
      sound.removeEventListener("ended", cleanup);
      sound.removeEventListener("error", cleanup);
      sound.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
      this.activeAudio.delete(sound);
    };

    const handleLoadedMetadata = () => {
      if (typeof options?.startAt === "number") {
        sound.currentTime = Math.max(0, options.startAt);
      }

      if (typeof options?.endAt === "number") {
        const durationMs = Math.max(0, options.endAt - (options.startAt ?? 0)) * 1000;
        stopTimer = window.setTimeout(() => {
          sound.pause();
          cleanup();
        }, durationMs);
      }

      void sound.play().catch(() => {
        cleanup();
      });
    };

    sound.addEventListener("ended", cleanup);
    sound.addEventListener("error", cleanup);
    sound.addEventListener("loadedmetadata", handleLoadedMetadata);
    this.activeAudio.add(sound);
    sound.load();
  }

  private async playSequence(sequence: Tone[]): Promise<void> {
    if (this.masterVolume <= 0) {
      return;
    }

    const context = this.ensureContext();
    if (context.state !== "running") {
      await context.resume();
    }

    const baseTime = context.currentTime + 0.01;

    for (const tone of sequence) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startTime = baseTime + tone.start;
      const endTime = startTime + tone.duration;
      const peakGain = tone.gain * this.masterVolume;

      oscillator.type = tone.waveform;
      oscillator.frequency.setValueAtTime(tone.frequency, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.02, tone.duration / 3));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    }
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }

    return this.context;
  }

  private readStoredVolume(): number {
    const stored = Number.parseFloat(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (Number.isNaN(stored)) {
      return DEFAULT_MASTER_VOLUME;
    }

    return Math.max(0, Math.min(1, stored));
  }
}
