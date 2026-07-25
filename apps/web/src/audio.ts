import { assetUrl } from "./assetUrl.ts";

const sfxCache = new Map<string, HTMLAudioElement>();
const lastPlayed = new Map<string, number>();
const COOLDOWN_MS = 3000;

export function playSound(url: string, volume = 0.5): void {
  const now = Date.now();
  if (now - (lastPlayed.get(url) ?? 0) < COOLDOWN_MS) return;
  lastPlayed.set(url, now);
  try {
    let audio = sfxCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      sfxCache.set(url, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* autoplay blocked */
    });
  } catch {
    // ignore
  }
}

export type MusicTrack = "menu" | "exploration" | "combat" | "victory";

const TRACK_URLS: Record<MusicTrack, string> = {
  menu: assetUrl("/audio/music/menu.mp3"),
  exploration: assetUrl("/audio/music/exploration.mp3"),
  combat: assetUrl("/audio/music/combat.mp3"),
  victory: assetUrl("/audio/music/victory.mp3"),
};

const FADE_DURATION_MS = 1500;
const MUSIC_VOLUME = 0.35;

class MusicPlayer {
  private current: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  play(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.stopFade();
    if (this.current) {
      const outgoing = this.current;
      this.fadeOut(outgoing, () => outgoing.pause());
    }
    const audio = new Audio(TRACK_URLS[track]);
    audio.loop = true;
    audio.volume = 0;
    audio.play().catch(() => {
      /* autoplay blocked */
    });
    this.fadeIn(audio);
    this.current = audio;
    this.currentTrack = track;
  }

  stop(): void {
    this.stopFade();
    if (this.current) {
      const outgoing = this.current;
      this.fadeOut(outgoing, () => outgoing.pause());
      this.current = null;
      this.currentTrack = null;
    }
  }

  private stopFade(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private fadeIn(audio: HTMLAudioElement): void {
    const steps = 20;
    const interval = FADE_DURATION_MS / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.min(MUSIC_VOLUME, (step / steps) * MUSIC_VOLUME);
      if (step >= steps) clearInterval(timer);
    }, interval);
  }

  private fadeOut(audio: HTMLAudioElement, onDone: () => void): void {
    const startVol = audio.volume;
    const steps = 20;
    const interval = FADE_DURATION_MS / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(timer);
        onDone();
      }
    }, interval);
    this.fadeTimer = timer;
  }
}

export const musicPlayer = new MusicPlayer();

export const SFX = {
  buildComplete: assetUrl("/audio/sfx/build_complete.wav"),
  attack: assetUrl("/audio/sfx/attack.wav"),
  blackMarket: assetUrl("/audio/sfx/black_market_visit.wav"),
  defeat: assetUrl("/audio/sfx/defeat.wav"),
  espionage: assetUrl("/audio/sfx/espionage_detected.wav"),
  notification: assetUrl("/audio/sfx/notification.wav"),
  oreProduced: assetUrl("/audio/sfx/ore_produced.wav"),
  treatySigned: assetUrl("/audio/sfx/treaty_signed.wav"),
  victoryFanfare: assetUrl("/audio/sfx/victory_fanfare.wav"),
  engineCharging: assetUrl("/audio/sfx/asteroid_engine_charging.wav"),
} as const;
