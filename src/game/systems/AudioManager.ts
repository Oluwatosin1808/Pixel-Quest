import { Howl, Howler } from 'howler';
import { renderSound } from '../utils/audioSynth';
import type { Settings } from '../../types';
import { DEFAULT_SETTINGS } from './SaveSystem';

export type SfxName =
  | 'coin'
  | 'sword'
  | 'hit'
  | 'hurt'
  | 'jump'
  | 'crystal'
  | 'checkpoint'
  | 'victory'
  | 'gameover'
  | 'click'
  | 'select'
  | 'locked';

export type MusicName = 'menu' | 'level';

const SFX_NAMES: SfxName[] = ['coin', 'sword', 'hit', 'hurt', 'jump', 'crystal', 'checkpoint', 'victory', 'gameover', 'click', 'select', 'locked'];

/**
 * Audio manager built on Howler.js. All clips are synthesised at runtime
 * (see audioSynth.ts), so nothing can go missing at load time. Every public
 * method is failure-tolerant: audio problems never break gameplay.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  static get(): AudioManager {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  private sfx: Partial<Record<SfxName, Howl>> = {};
  private music: Partial<Record<MusicName, Howl>> = {};
  private ambience: Howl | null = null;
  private generated = false;
  private failed = false;
  private requestedMusic: MusicName | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private unlockHooked = false;

  private constructor() {}

  /** Generate every clip once. Safe to call repeatedly. */
  init(settings: Settings): void {
    this.settings = settings;
    if (this.generated || this.failed) return;
    this.generated = true;
    try {
      for (const name of SFX_NAMES) {
        this.sfx[name] = this.makeHowl(renderSound(name), 1);
      }
      this.music.menu = this.makeHowl(renderSound('music_menu'), 0.9, true);
      this.music.level = this.makeHowl(renderSound('music_level'), 0.9, true);
      this.ambience = this.makeHowl(renderSound('music_ambience'), 0.55, true);
      this.hookUnlock();
      this.applyVolumes();
    } catch {
      // Synthesis unavailable (e.g. no AudioContext) — run silent.
      this.failed = true;
      this.sfx = {};
      this.music = {};
      this.ambience = null;
    }
  }

  private makeHowl(blob: Blob, volume: number, loop = false): Howl {
    const url = URL.createObjectURL(blob);
    return new Howl({ src: [url], format: ['wav'], volume, loop, preload: true });
  }

  /** Resume the WebAudio context on the first user gesture. */
  private hookUnlock(): void {
    if (this.unlockHooked) return;
    this.unlockHooked = true;
    const resume = (): void => {
      try {
        void Howler.ctx?.resume();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume);
  }

  unlock(): void {
    try {
      void Howler.ctx?.resume();
    } catch {
      /* ignore */
    }
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    this.applyVolumes();
    // Honour the new music toggle immediately.
    if (settings.music) {
      if (this.requestedMusic) this.startMusic(this.requestedMusic);
      this.ambience?.play();
    } else {
      this.stopMusic();
      this.ambience?.stop();
    }
  }

  private applyVolumes(): void {
    for (const howl of Object.values(this.sfx)) howl?.volume(this.settings.sfxVolume);
    for (const howl of Object.values(this.music)) howl?.volume(this.settings.musicVolume * 0.9);
    this.ambience?.volume(this.settings.musicVolume * 0.5);
  }

  playSfx(name: SfxName): void {
    if (!this.settings.sfx) return;
    const howl = this.sfx[name];
    if (!howl) return;
    try {
      howl.volume(this.settings.sfxVolume);
      howl.play();
    } catch {
      /* ignore */
    }
  }

  /** Start (or switch to) a music loop. No-op when already playing it. */
  playMusic(name: MusicName): void {
    this.requestedMusic = name;
    if (!this.settings.music) return;
    this.startMusic(name);
  }

  private startMusic(name: MusicName): void {
    if (!this.failed) {
      for (const [key, howl] of Object.entries(this.music)) {
        if (key !== name) howl?.stop();
      }
      const howl = this.music[name];
      if (howl) {
        try {
          if (!howl.playing()) {
            howl.volume(this.settings.musicVolume * 0.9);
            howl.play();
          }
        } catch {
          /* ignore */
        }
      }
      try {
        if (this.ambience && !this.ambience.playing()) {
          this.ambience.volume(this.settings.musicVolume * 0.5);
          this.ambience.play();
        }
      } catch {
        /* ignore */
      }
    }
  }

  stopMusic(): void {
    for (const howl of Object.values(this.music)) howl?.stop();
    this.ambience?.stop();
    this.requestedMusic = null;
  }

  /** Release object URLs when the game instance is torn down. */
  dispose(): void {
    this.stopMusic();
    for (const howl of Object.values(this.sfx)) howl?.unload();
    for (const howl of Object.values(this.music)) howl?.unload();
    this.ambience?.unload();
    this.sfx = {};
    this.music = {};
    this.ambience = null;
    this.generated = false;
  }
}
