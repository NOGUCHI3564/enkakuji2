// 自然環境音瞑想システム & 覚悟の石 発光サウンドエンジン
// 本物の高音質実音MP3音源（雨・波・森・小川・寺院の鐘）による高品位サウンドエンジン
// 【完全シームレス・デュアル・クロスフェード・ループ（Gapless Web Audio Engine）】
// 
// 特徴:
// 1. Web Audio API によるメモリ内 AudioBuffer デコード再生。
//    ブラウザの <audio> 要素の仕様による終端での無音ラグ・息継ぎ（100〜300msの途切れ）を根本から解消。
// 2. 2系統のノードによるデュアル・クロスフェード（Double-Buffering Crossfade Loop）:
//    音源の終端 2.5秒手前から次のノードを重ねて滑らかにフェードイン・フェードアウト。
//    MP3の境界パディングや波形の不連続を完全に溶かし込み、永遠に途切れない静寂の響きを実現。
// 3. 寺院の磬子（けいす・シンギングボウル）の実音MP3も AudioBuffer から即時・高音質再生。
// 4. iOS Safari / Android Chrome / PWA のマナーモード・メディアセッション対応。

import { SoundType } from "../types/zen";

const BASE = import.meta.env.BASE_URL || "/";
const AUDIO_URLS: Record<Exclude<SoundType, "silence">, string> = {
  rain: `${BASE}audio/rain.mp3`,
  waves: `${BASE}audio/waves.mp3`,
  forest: `${BASE}audio/forest.mp3`,
  stream: `${BASE}audio/stream.mp3`,
  bell: `${BASE}audio/bell.mp3`,
};

// 各自然環境音ごとの知覚ラウドネス・瞑想最適化ゲイン倍率
// 「森」は小鳥のさえずりや高周波の刺激を抑え、静寂の深みを保つために控えめ（0.55）に設計
const SOUND_GAIN_MULTIPLIERS: Record<SoundType, number> = {
  rain: 0.85,
  waves: 0.90,
  forest: 0.55,
  stream: 0.80,
  bell: 0.85,
  silence: 0,
};

// クロスフェードのオーバーラップ時間（秒）
const CROSSFADE_DURATION = 2.5;

// iOS Safari の消音スイッチ制限を解除する極小WAV
const SILENT_UNLOCK_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

interface AmbientSourceSlot {
  source: AudioBufferSourceNode;
  gain: GainNode;
  stopTime: number;
}

class ZenSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSound: SoundType = "silence";
  private volume = 0.8;
  private unlockAudioEl: HTMLAudioElement | null = null;

  // デコード済み AudioBuffer キャッシュ
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer | null>> = new Map();

  // 環境音（シームレス・クロスフェード）再生管理
  private ambientMasterGain: GainNode | null = null;
  private activeAmbientSlots: Set<AmbientSourceSlot> = new Set();
  private ambientLoopTimer: number | null = null;
  private ambientSessionId = 0;

  constructor() {
    // 起動時に各実音MP3をバックグラウンドで先読み＆デコード
    if (typeof window !== "undefined") {
      // ユーザー操作前でも fetch は可能
      this.preloadAll();
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

  // 音声ファイルを fetch して AudioBuffer にデコード（キャッシュ対応）
  private async getAudioBuffer(key: string): Promise<AudioBuffer | null> {
    const cached = this.audioBufferCache.get(key);
    if (cached) return cached;

    const pending = this.pendingFetches.get(key);
    if (pending) return pending;

    const url = AUDIO_URLS[key as keyof typeof AUDIO_URLS];
    if (!url) return null;

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = this.ensureContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.audioBufferCache.set(key, audioBuffer);
        return audioBuffer;
      } catch (err) {
        console.warn(`Failed to load audio for ${key}:`, err);
        return null;
      } finally {
        this.pendingFetches.delete(key);
      }
    })();

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  private preloadAll() {
    try {
      Object.keys(AUDIO_URLS).forEach((key) => {
        // バックグラウンドで静かに fetch 開始
        this.getAudioBuffer(key).catch(() => {});
      });
    } catch {
      // ignore
    }
  }

  private getEffectiveAmbientVolume(sound: SoundType = this.currentSound): number {
    const mult = SOUND_GAIN_MULTIPLIERS[sound] ?? 0.8;
    return Math.max(0, Math.min(1, this.volume * mult));
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.1
      );
    }

    // 再生中の環境音マスターゲインも即時更新
    if (this.ambientMasterGain && this.ctx) {
      const target = this.getEffectiveAmbientVolume();
      this.ambientMasterGain.gain.setTargetAtTime(
        target,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentSound(): SoundType {
    return this.currentSound;
  }

  // UI操作時の「おりん（鈴）」の柔らかな響き（即時サイン波）
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

  // 「覚悟の石」顕現時・瞑想完了時の本物の「磬子（けいす・寺院シンギングボウル）」実音再生
  public playStoneManifestationBell() {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain || this.volume <= 0.01) return;

      this.getAudioBuffer("bell").then((buffer) => {
        if (!buffer || !this.ctx || !this.masterGain) {
          this.playSyntheticBellFallback();
          return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const bellGain = this.ctx.createGain();
        bellGain.gain.value = Math.min(1.0, this.volume * 0.95);

        source.connect(bellGain);
        bellGain.connect(this.masterGain);

        source.start(this.ctx.currentTime);
      }).catch(() => {
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

  // 自然環境音（雨・波・森・小川・静寂）の開始
  // 【完全シームレス・デュアル・クロスフェード・ループ】
  public startAmbientSound(type: SoundType) {
    this.stopAmbientSound();
    this.currentSound = type;
    if (type === "silence") return;

    try {
      const ctx = this.ensureContext();
      const sessionId = ++this.ambientSessionId;

      // 自然音全体のマスターゲインノードを作成
      const ambientMaster = ctx.createGain();
      const targetVolume = this.getEffectiveAmbientVolume(type);

      // 初回は 1.2秒 かけて静かにフェードイン
      const now = ctx.currentTime;
      ambientMaster.gain.setValueAtTime(0.0001, now);
      ambientMaster.gain.linearRampToValueAtTime(targetVolume, now + 1.2);
      ambientMaster.connect(this.masterGain || ctx.destination);
      this.ambientMasterGain = ambientMaster;

      // AudioBuffer を取得してデュアル・クロスフェード・ループを開始
      this.getAudioBuffer(type).then((buffer) => {
        if (!buffer || this.ambientSessionId !== sessionId || !this.ctx) return;
        this.runSeamlessLoop(buffer, sessionId);
      }).catch((err) => {
        console.warn("Error loading ambient buffer:", err);
      });
    } catch (e) {
      console.warn("Error starting ambient sound:", e);
    }
  }

  // デュアル・クロスフェード・ループの実行ルーチン
  private runSeamlessLoop(buffer: AudioBuffer, sessionId: number) {
    if (!this.ctx || !this.ambientMasterGain || this.ambientSessionId !== sessionId) {
      return;
    }

    const duration = buffer.duration;
    // クロスフェード幅（音源の長さに応じて最大2.5秒）
    const fadeDuration = Math.min(CROSSFADE_DURATION, duration * 0.15);
    // 次のトラックを開始する周期（長さ - クロスフェード幅）
    const cycleInterval = Math.max(1.0, duration - fadeDuration);

    // スロットの再生スケジュール
    const scheduleSlot = (startTime: number) => {
      if (!this.ctx || !this.ambientMasterGain || this.ambientSessionId !== sessionId) {
        return;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const slotGain = this.ctx.createGain();

      // フェードイン (startTime 〜 startTime + fadeDuration)
      slotGain.gain.setValueAtTime(0.0001, startTime);
      slotGain.gain.linearRampToValueAtTime(1.0, startTime + fadeDuration);

      // フェードアウト (startTime + duration - fadeDuration 〜 startTime + duration)
      const fadeOutStart = startTime + duration - fadeDuration;
      slotGain.gain.setValueAtTime(1.0, fadeOutStart);
      slotGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

      source.connect(slotGain);
      slotGain.connect(this.ambientMasterGain);

      source.start(startTime);
      const stopTime = startTime + duration + 0.1;
      source.stop(stopTime);

      const slot: AmbientSourceSlot = { source, gain: slotGain, stopTime };
      this.activeAmbientSlots.add(slot);

      source.onended = () => {
        this.activeAmbientSlots.delete(slot);
      };
    };

    // 1つ目のノードを即時開始
    const firstStartTime = this.ctx.currentTime;
    scheduleSlot(firstStartTime);

    // 次のノードのスケジュールを管理する再帰タイマー
    let nextStartTime = firstStartTime + cycleInterval;

    const scheduleNext = () => {
      if (this.ambientSessionId !== sessionId || !this.ctx) return;

      const currentTime = this.ctx.currentTime;
      // 次の開始予定時刻の 1秒前 に来たらスケジューリング
      const timeUntilNext = (nextStartTime - currentTime) * 1000;

      if (timeUntilNext <= 1200) {
        // Web Audioのタイムラインに正確に予約
        scheduleSlot(nextStartTime);
        nextStartTime += cycleInterval;
      }

      // 500ms ごとに監視して時間通りに次をキュー
      this.ambientLoopTimer = window.setTimeout(scheduleNext, 500);
    };

    this.ambientLoopTimer = window.setTimeout(scheduleNext, 500);
  }

  // 自然環境音の停止（滑らかなフェードアウト）
  public stopAmbientSound() {
    this.currentSound = "silence";
    this.ambientSessionId++; // 以前のスケジュールを直ちに無効化

    if (this.ambientLoopTimer) {
      clearTimeout(this.ambientLoopTimer);
      this.ambientLoopTimer = null;
    }

    const master = this.ambientMasterGain;
    const ctx = this.ctx;
    const slots = Array.from(this.activeAmbientSlots);
    this.activeAmbientSlots.clear();
    this.ambientMasterGain = null;

    if (!master || !ctx) {
      slots.forEach((s) => {
        try { s.source.stop(); } catch {}
      });
      return;
    }

    try {
      // 0.6秒かけて滑らかにフェードアウト
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.6);

      setTimeout(() => {
        slots.forEach((s) => {
          try {
            s.source.stop();
            s.source.disconnect();
            s.gain.disconnect();
          } catch {}
        });
        try {
          master.disconnect();
        } catch {}
      }, 650);
    } catch {
      slots.forEach((s) => {
        try { s.source.stop(); } catch {}
      });
    }
  }
}

export const soundEngine = new ZenSoundEngine();
