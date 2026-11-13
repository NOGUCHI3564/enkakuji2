// 自然環境音瞑想システム & 覚悟の石 発光サウンドエンジン
// 本物の高音質実音MP3音源（雨・波・森・小川・寺院の鐘）による高品位サウンドエンジン
// スマートフォン（iOS Safari / Android Chrome / PWA）対応強化版：
// 1. 各自然音（雨、波、森、小川）を本物の録音によるシームレスループMP3で再生。
// 2. 寺院の磬子（けいす・シンギングボウル）の実音MP3を覚悟の石顕現・瞑想完了時に再生。
// 3. iOSのマナーモード（消音スイッチ）でもメディア音声として再生される設計＆滑らかなフェードイン/アウト。

import { SoundType } from "../types/zen";

const BASE = import.meta.env.BASE_URL || "/";
const AUDIO_URLS: Record<Exclude<SoundType, "silence"> | "bell", string> = {
  rain: `${BASE}audio/rain.mp3`,
  waves: `${BASE}audio/waves.mp3`,
  forest: `${BASE}audio/forest.mp3`,
  stream: `${BASE}audio/stream.mp3`,
  bell: `${BASE}audio/bell.mp3`,
};

// iOS Safari の消音スイッチ制限を解除する極小WAV
const SILENT_UNLOCK_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

class ZenSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSound: SoundType = "silence";
  private volume = 0.8;
  private unlockAudioEl: HTMLAudioElement | null = null;

  // 環境音（MP3ループ）再生用
  private currentAmbientAudio: HTMLAudioElement | null = null;
  private ambientFadeInterval: number | null = null;

  // 事前プリロード済みオーディオキャッシュ
  private audioPreloadCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // 起動時に各実音MP3を静かにバックグラウンドプリロード
    if (typeof window !== "undefined") {
      this.preloadAll();
    }
  }

  private preloadAll() {
    try {
      Object.entries(AUDIO_URLS).forEach(([key, url]) => {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        this.audioPreloadCache.set(key, audio);
      });
    } catch {
      // ignore
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      // iOS 17+ AudioSession API（マナーモードでもメディア再生枠を確保）
      const nav = navigator as unknown as {
        audioSession?: { type: string };
      };
      if (nav.audioSession) {
        try {
          nav.audioSession.type = "playback";
        } catch {
          // ignore
        }
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    // HTMLAudioElement をユーザージェスチャー内で一度再生し、iOS WebKit のメディアチャンネルをアンロック
    if (!this.unlockAudioEl && typeof Audio !== "undefined") {
      try {
        this.unlockAudioEl = new Audio(SILENT_UNLOCK_WAV);
        this.unlockAudioEl.loop = false;
        this.unlockAudioEl.volume = 0.01;
        this.unlockAudioEl.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));

    // AudioContext のマスターゲイン更新
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.15
      );
    }

    // 再生中の環境音MP3のボリュームも連動
    if (this.currentAmbientAudio && !this.ambientFadeInterval) {
      this.currentAmbientAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentSound(): SoundType {
    return this.currentSound;
  }

  // UI操作時や問いかけ表示時の、落ち着いた低音「おりん（鈴）」の柔らかな響き（即時サイン波）
  public playWaterDrop(pitchMultiplier = 1.0) {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain || this.volume <= 0.01) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = 432 * Math.max(0.85, Math.min(1.15, pitchMultiplier));
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12 * this.volume, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch {
      // ignore
    }
  }

  // 「覚悟の石」顕現時・瞑想完了時の本物の「磬子（けいす・寺院シンギングボウル）」実音MP3再生
  public playStoneManifestationBell() {
    try {
      this.ensureContext();
      if (this.volume <= 0.01) return;

      const bellAudio = new Audio(AUDIO_URLS.bell);
      bellAudio.volume = Math.min(1.0, this.volume * 0.95);
      bellAudio.play().catch(() => {
        // フォールバック: 万一オーディオファイル再生がブロックされた場合は合成音
        this.playSyntheticBellFallback();
      });
    } catch {
      this.playSyntheticBellFallback();
    }
  }

  // フォールバック用合成磬子音
  private playSyntheticBellFallback() {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain || this.volume <= 0.01) return;
      const now = ctx.currentTime;
      const partials = [
        { freq: 288, amp: 0.28, decay: 5.0 },
        { freq: 576, amp: 0.16, decay: 4.2 },
        { freq: 864, amp: 0.09, decay: 3.4 },
      ];
      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(p.freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(p.amp * this.volume, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });
    } catch {
      // ignore
    }
  }

  // 自然環境音（雨・波・森・小川・静寂）の開始（高品質本物MP3によるシームレスループ再生）
  public startAmbientSound(type: SoundType) {
    this.stopAmbientSound();
    this.currentSound = type;
    if (type === "silence") return;

    try {
      this.ensureContext();
      const soundUrl = AUDIO_URLS[type];
      if (!soundUrl) return;

      const audio = new Audio(soundUrl);
      audio.loop = true;
      audio.volume = 0; // フェードイン開始

      const targetVolume = this.volume;
      this.currentAmbientAudio = audio;

      audio.play().then(() => {
        // 1.2秒かけて滑らかに目標音量までフェードイン
        const stepTimeMs = 50;
        const totalSteps = 1200 / stepTimeMs;
        let currentStep = 0;

        if (this.ambientFadeInterval) {
          clearInterval(this.ambientFadeInterval);
        }

        this.ambientFadeInterval = window.setInterval(() => {
          currentStep++;
          const progress = Math.min(1, currentStep / totalSteps);
          if (audio) {
            audio.volume = targetVolume * progress;
          }
          if (progress >= 1) {
            if (this.ambientFadeInterval) {
              clearInterval(this.ambientFadeInterval);
              this.ambientFadeInterval = null;
            }
          }
        }, stepTimeMs);
      }).catch((err) => {
        console.warn("Ambient sound autoplay prevented or failed:", err);
      });
    } catch (e) {
      console.warn("Error starting ambient sound:", e);
    }
  }

  // 自然環境音の停止（滑らかなフェードアウト）
  public stopAmbientSound() {
    this.currentSound = "silence";
    if (this.ambientFadeInterval) {
      clearInterval(this.ambientFadeInterval);
      this.ambientFadeInterval = null;
    }

    const audio = this.currentAmbientAudio;
    if (!audio) return;
    this.currentAmbientAudio = null;

    try {
      const initialVol = audio.volume;
      const stepTimeMs = 40;
      const totalSteps = 600 / stepTimeMs; // 0.6秒でフェードアウト
      let currentStep = 0;

      const fadeOutInterval = window.setInterval(() => {
        currentStep++;
        const progress = Math.min(1, currentStep / totalSteps);
        audio.volume = Math.max(0, initialVol * (1 - progress));

        if (progress >= 1 || audio.volume <= 0.01) {
          clearInterval(fadeOutInterval);
          audio.pause();
          audio.currentTime = 0;
          audio.removeAttribute("src");
          audio.load();
        }
      }, stepTimeMs);
    } catch {
      audio.pause();
    }
  }
}

export const soundEngine = new ZenSoundEngine();
