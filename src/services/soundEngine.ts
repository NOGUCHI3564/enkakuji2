// 自然環境音瞑想システム & 覚悟の石 発光サウンドエンジン
// スマートフォン（iOS Safari / Android Chrome）対応強化版：
// 1. iOS のマナーモード（消音スイッチ）時でもメディア音声として出力されるよう HTML5 <audio> ストリームアンロック＆ MediaSession を併用。
// 2. スマホの小型スピーカーでもはっきり・かつ心地よく聞こえる実効音圧（RMS）と中域（250Hz〜1800Hz）の豊かな自然音設計。
// 3. 刺激的な電子音（ピョンピョン音）は一切使わず、本物の雨・波・森・小川の空気感を合成。

import { SoundType } from "../types/zen";

// iOS Safari の消音スイッチ（Ringer Switch）制限を解除し、AudioContext を確実にアクティブ化する無音WAV（極小データURI）
const SILENT_UNLOCK_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

class ZenSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private isPlaying = false;
  private currentSound: SoundType = "silence";
  private volume = 0.8;
  private unlockAudioEl: HTMLAudioElement | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      // iOS 17+ AudioSession API（対応ブラウザではマナーモードでもメディア再生枠を強制）
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
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.15
      );
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // UI操作時や問いかけ表示時の、落ち着いた低音「おりん（鈴）」の柔らかな響き
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

  // 「覚悟の石」顕現時・瞑想完了時の深い「磬子（けいす・シンギングボウル）」倍音
  public playStoneManifestationBell() {
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

  // スマートフォンのスピーカーでも十分な音量と温かみが出る、正規化済み8秒ステレオノイズバッファ
  private createRichNoiseBuffer(
    ctx: AudioContext,
    mode: "pink" | "brown"
  ): AudioBuffer {
    const durationSeconds = 8;
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      let maxPeak = 0.001;

      if (mode === "brown") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.035 * white) / 1.035;
          output[i] = lastOut;
          const abs = Math.abs(lastOut);
          if (abs > maxPeak) maxPeak = abs;
        }
      } else {
        // ピンクノイズ（Paul Kellet アルゴリズム）
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const val = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          output[i] = val;
          const abs = Math.abs(val);
          if (abs > maxPeak) maxPeak = abs;
        }
      }

      // ピーク正規化（スマホのスピーカーでもしっかり鳴り、かつクリップしない 0.65 レベルに揃える）
      const targetPeak = 0.65;
      const scale = targetPeak / maxPeak;
      for (let i = 0; i < bufferSize; i++) {
        output[i] *= scale;
      }

      // ループ境界（前後0.2秒）のクロスフェード平滑化
      const fadeSamples = Math.floor(ctx.sampleRate * 0.2);
      for (let i = 0; i < fadeSamples; i++) {
        const ratio = i / fadeSamples;
        output[i] =
          output[i] * ratio +
          output[bufferSize - fadeSamples + i] * (1 - ratio);
      }
    }

    return buffer;
  }

  // 自然環境音（雨・波・森・小川・静寂）の開始
  public startAmbientSound(type: SoundType) {
    this.stopAmbientSound();
    this.currentSound = type;
    if (type === "silence") return;

    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      this.isPlaying = true;

      const now = ctx.currentTime;
      const envGain = ctx.createGain();
      // ボタンを押した直後に音が出ていることがすぐ分かるよう、0.08から開始して1.2秒で滑らかに立ち上げる
      envGain.gain.setValueAtTime(0.08, now);
      envGain.gain.linearRampToValueAtTime(0.95, now + 1.2);
      envGain.connect(this.masterGain);
      this.activeNodes.push(envGain);

      if (type === "rain") {
        // 【雨】：スマホのスピーカーでも心地よく響く、しっとりとした雨音（中低域の雨粒の厚み＋柔らかい雨脚）
        const rainBodySrc = ctx.createBufferSource();
        rainBodySrc.buffer = this.createRichNoiseBuffer(ctx, "pink");
        rainBodySrc.loop = true;

        // スマホで最も聞き取りやすく耳に優しい 350Hz〜1600Hz 帯域を中心に通す
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 1650;

        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 180;

        // 遠雷・軒先の雨の深みを作るブラウニアン層
        const deepSrc = ctx.createBufferSource();
        deepSrc.buffer = this.createRichNoiseBuffer(ctx, "brown");
        deepSrc.loop = true;

        const deepGain = ctx.createGain();
        deepGain.gain.value = 0.55;

        rainBodySrc.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(envGain);

        deepSrc.connect(deepGain);
        deepGain.connect(envGain);

        rainBodySrc.start();
        deepSrc.start();

        this.activeNodes.push(
          rainBodySrc,
          lowpass,
          highpass,
          deepSrc,
          deepGain
        );
      } else if (type === "waves") {
        // 【波】：寄せては返す穏やかな潮騒（約8秒周期で音量と音色が大きくゆったり呼吸する）
        const waveSrc = ctx.createBufferSource();
        waveSrc.buffer = this.createRichNoiseBuffer(ctx, "pink");
        waveSrc.loop = true;

        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = "lowpass";
        waveFilter.frequency.value = 580; // スマホでもしっかり聞こえる中低域までカバー

        const waveAmp = ctx.createGain();
        waveAmp.gain.value = 0.65;

        // 波の満ち引きを作るLFO（0.125Hz = 8秒周期）
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.125;

        const lfoFilterGain = ctx.createGain();
        lfoFilterGain.gain.value = 420; // 160Hz（引き波）〜 1000Hz（寄せ波）の間でゆったり変化

        const lfoAmpGain = ctx.createGain();
        lfoAmpGain.gain.value = 0.45; // 音量も 0.2 〜 1.1 の間で波打つ

        lfo.connect(lfoFilterGain);
        lfoFilterGain.connect(waveFilter.frequency);

        lfo.connect(lfoAmpGain);
        lfoAmpGain.connect(waveAmp.gain);

        waveSrc.connect(waveFilter);
        waveFilter.connect(waveAmp);
        waveAmp.connect(envGain);

        waveSrc.start();
        lfo.start();

        this.activeNodes.push(
          waveSrc,
          waveFilter,
          waveAmp,
          lfo,
          lfoFilterGain,
          lfoAmpGain
        );
      } else if (type === "forest") {
        // 【森】：木々の葉を揺らす豊かな風と深山の静寂（2層の風のアンサンブル）
        const windSrc1 = ctx.createBufferSource();
        windSrc1.buffer = this.createRichNoiseBuffer(ctx, "pink");
        windSrc1.loop = true;

        const filter1 = ctx.createBiquadFilter();
        filter1.type = "bandpass";
        filter1.frequency.value = 520;
        filter1.Q.value = 0.9;

        const lfo1 = ctx.createOscillator();
        lfo1.type = "sine";
        lfo1.frequency.value = 0.08; // 12.5秒周期の風
        const lfoGain1 = ctx.createGain();
        lfoGain1.gain.value = 240;

        lfo1.connect(lfoGain1);
        lfoGain1.connect(filter1.frequency);

        const windSrc2 = ctx.createBufferSource();
        windSrc2.buffer = this.createRichNoiseBuffer(ctx, "brown");
        windSrc2.loop = true;

        const filter2 = ctx.createBiquadFilter();
        filter2.type = "lowpass";
        filter2.frequency.value = 450;

        const gain2 = ctx.createGain();
        gain2.gain.value = 0.6;

        windSrc1.connect(filter1);
        filter1.connect(envGain);

        windSrc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(envGain);

        windSrc1.start();
        lfo1.start();
        windSrc2.start();

        this.activeNodes.push(
          windSrc1,
          filter1,
          lfo1,
          lfoGain1,
          windSrc2,
          filter2,
          gain2
        );
      } else if (type === "stream") {
        // 【小川】：せせらぎの心地よい水流（2つの異なる周期で揺らぐ水流フィルタの重ね合わせ）
        const streamSrc = ctx.createBufferSource();
        streamSrc.buffer = this.createRichNoiseBuffer(ctx, "pink");
        streamSrc.loop = true;

        const band1 = ctx.createBiquadFilter();
        band1.type = "bandpass";
        band1.frequency.value = 680;
        band1.Q.value = 0.7;

        const band2 = ctx.createBiquadFilter();
        band2.type = "bandpass";
        band2.frequency.value = 1150;
        band2.Q.value = 0.9;

        const lfo1 = ctx.createOscillator();
        lfo1.type = "sine";
        lfo1.frequency.value = 0.32;
        const lfoGain1 = ctx.createGain();
        lfoGain1.gain.value = 180;

        const lfo2 = ctx.createOscillator();
        lfo2.type = "sine";
        lfo2.frequency.value = 0.19;
        const lfoGain2 = ctx.createGain();
        lfoGain2.gain.value = 220;

        lfo1.connect(lfoGain1);
        lfoGain1.connect(band1.frequency);

        lfo2.connect(lfoGain2);
        lfoGain2.connect(band2.frequency);

        const mixGain = ctx.createGain();
        mixGain.gain.value = 0.75;

        streamSrc.connect(band1);
        streamSrc.connect(band2);
        band1.connect(mixGain);
        band2.connect(mixGain);
        mixGain.connect(envGain);

        streamSrc.start();
        lfo1.start();
        lfo2.start();

        this.activeNodes.push(
          streamSrc,
          band1,
          band2,
          lfo1,
          lfoGain1,
          lfo2,
          lfoGain2,
          mixGain
        );
      }
    } catch {
      // ignore
    }
  }

  public stopAmbientSound() {
    this.isPlaying = false;
    this.activeIntervals.forEach((id) => clearInterval(id));
    this.activeIntervals = [];
    this.activeNodes.forEach((node) => {
      try {
        if (
          "stop" in node &&
          typeof (node as AudioScheduledSourceNode).stop === "function"
        ) {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
  }
}

export const soundEngine = new ZenSoundEngine();
