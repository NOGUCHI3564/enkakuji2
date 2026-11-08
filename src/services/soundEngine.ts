// 自然環境音瞑想システム & 覚悟の石 発光サウンドエンジン (Web Audio API によるオーガニック音響合成)
// 瞑想の妨げになる人工的なピッチスイープ音（ピョンピョン音）を一切排除し、
// 多層的なブラウニアン/ピンクノイズと超低周波ゆらぎ（1/fゆらぎ近似）による
// 本物の雨・波・森の風・小川のせせらぎに近い深く落ち着いた自然環境音と、
// 仏具「おりん（鈴・磬子）」の穏やかな倍音余韻のみを生成する。

import { SoundType } from "../types/zen";

class ZenSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private isPlaying = false;
  private currentSound: SoundType = "silence";
  private volume = 0.6;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.25
      );
    }
  }

  // UI操作時や問いかけ表示時の、極めて控えめで落ち着いた低音の「おりん（木魚/鈴）」の微細音
  // ※ 以前のピッチが跳ねるピョンピョン音は完全に廃止し、一定周波数の穏やかな倍音減衰にする
  public playWaterDrop(pitchMultiplier = 1.0) {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain || this.volume <= 0.01) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // 落ち着く中低域の純正律倍音（ピッチは一切動かさない）
      const freq = 396 * Math.max(0.85, Math.min(1.15, pitchMultiplier));
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // 柔らかいアタックと短い静かな余韻（刺激にならない音量）
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.035 * this.volume, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.95);
    } catch {
      // ignore
    }
  }

  // 「覚悟の石」が立ち上がる瞬間・瞑想完了時の、深く澄んだ「磬子（けいす・シンギングボウル）」の倍音
  public playStoneManifestationBell() {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain || this.volume <= 0.01) return;

      const now = ctx.currentTime;
      // 寺院の磬子（けいす）に近い落ち着きのある非整数倍音を含む共鳴周波数
      const partials = [
        { freq: 256, amp: 0.14, decay: 5.5 },
        { freq: 512, amp: 0.08, decay: 4.8 },
        { freq: 768, amp: 0.04, decay: 3.8 },
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(p.freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(p.amp * this.volume, now + 0.08);
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

  // 滑らかなステレオ・ピンクノイズ＆ブラウニアンノイズバッファ（8秒シームレス）を生成
  private createOrganicNoiseBuffer(
    ctx: AudioContext,
    mode: "pink" | "brown"
  ): AudioBuffer {
    const durationSeconds = 8;
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      if (mode === "brown") {
        // ブラウニアンノイズ（波・深い雨の重低音・遠鳴り用：高域の刺さりが全くない温かい音）
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 0.18;
        }
      } else {
        // ピンクノイズ（木の葉の揺れ・優しい霧雨・せせらぎ用）
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
          output[i] =
            (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.032;
          b6 = white * 0.115926;
        }
      }

      // ループ境界のクロスフェード平滑化（継ぎ目を完全に消す）
      const fadeSamples = Math.floor(ctx.sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const ratio = i / fadeSamples;
        output[i] =
          output[i] * ratio + output[bufferSize - fadeSamples + i] * (1 - ratio);
      }
    }

    return buffer;
  }

  // 自然環境音（雨・波・森・小川・静寂）の再生
  // ※ 刺激的な電子音・ピョンピョン音は一切鳴らさず、純粋な自然の空気感のみを合成する
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
      envGain.gain.setValueAtTime(0.0001, now);
      envGain.gain.linearRampToValueAtTime(0.55, now + 2.5); // 2.5秒かけてゆっくりフェードイン
      envGain.connect(this.masterGain);
      this.activeNodes.push(envGain);

      if (type === "rain") {
        // 【雨】：しっとりとした軒先の霧雨（ブラウニアンノイズの低域 ＋ ローパスをかけた柔らかいピンクノイズ）
        const brownSrc = ctx.createBufferSource();
        brownSrc.buffer = this.createOrganicNoiseBuffer(ctx, "brown");
        brownSrc.loop = true;

        const brownFilter = ctx.createBiquadFilter();
        brownFilter.type = "lowpass";
        brownFilter.frequency.value = 340;

        const pinkSrc = ctx.createBufferSource();
        pinkSrc.buffer = this.createOrganicNoiseBuffer(ctx, "pink");
        pinkSrc.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = "bandpass";
        rainFilter.frequency.value = 780;
        rainFilter.Q.value = 0.45;

        const rainHighCut = ctx.createBiquadFilter();
        rainHighCut.type = "lowpass";
        rainHighCut.frequency.value = 1400; // 耳に刺さる高域をカット

        brownSrc.connect(brownFilter);
        brownFilter.connect(envGain);

        pinkSrc.connect(rainFilter);
        rainFilter.connect(rainHighCut);
        rainHighCut.connect(envGain);

        brownSrc.start();
        pinkSrc.start();
        this.activeNodes.push(
          brownSrc,
          brownFilter,
          pinkSrc,
          rainFilter,
          rainHighCut
        );
      } else if (type === "waves") {
        // 【波】：約9秒周期で寄せては返す穏やかな夜の潮騒
        const waveSrc = ctx.createBufferSource();
        waveSrc.buffer = this.createOrganicNoiseBuffer(ctx, "brown");
        waveSrc.loop = true;

        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = "lowpass";
        waveFilter.frequency.value = 260;

        const waveVolumeGain = ctx.createGain();
        waveVolumeGain.gain.value = 0.45;

        // 波の満ち引きを作る超低周波サイン波（0.11Hz = 約9秒周期）
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.11;

        const lfoFilterDepth = ctx.createGain();
        lfoFilterDepth.gain.value = 180; // 80Hz 〜 440Hz の間でゆっくりフィルタが開閉

        const lfoAmpDepth = ctx.createGain();
        lfoAmpDepth.gain.value = 0.28; // 音量も波に合わせてゆっくり呼吸する

        lfo.connect(lfoFilterDepth);
        lfoFilterDepth.connect(waveFilter.frequency);

        lfo.connect(lfoAmpDepth);
        lfoAmpDepth.connect(waveVolumeGain.gain);

        waveSrc.connect(waveFilter);
        waveFilter.connect(waveVolumeGain);
        waveVolumeGain.connect(envGain);

        waveSrc.start();
        lfo.start();
        this.activeNodes.push(
          waveSrc,
          waveFilter,
          waveVolumeGain,
          lfo,
          lfoFilterDepth,
          lfoAmpDepth
        );
      } else if (type === "forest") {
        // 【森】：木々の梢を吹き抜ける穏やかな風（2系統のゆるやかなフィルタ変調）
        const windSrc = ctx.createBufferSource();
        windSrc.buffer = this.createOrganicNoiseBuffer(ctx, "pink");
        windSrc.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = "bandpass";
        windFilter.frequency.value = 420;
        windFilter.Q.value = 1.4;

        const windLowpass = ctx.createBiquadFilter();
        windLowpass.type = "lowpass";
        windLowpass.frequency.value = 950;

        const windLfo = ctx.createOscillator();
        windLfo.type = "sine";
        windLfo.frequency.value = 0.07; // 約14秒周期のゆったりした風

        const windLfoGain = ctx.createGain();
        windLfoGain.gain.value = 160;

        windLfo.connect(windLfoGain);
        windLfoGain.connect(windFilter.frequency);

        windSrc.connect(windFilter);
        windFilter.connect(windLowpass);
        windLowpass.connect(envGain);

        windSrc.start();
        windLfo.start();
        this.activeNodes.push(
          windSrc,
          windFilter,
          windLowpass,
          windLfo,
          windLfoGain
        );
      } else if (type === "stream") {
        // 【小川】：遠くに流れる静かなせせらぎ（柔らかいローパス＋微細な水流のゆらぎ）
        const streamSrc = ctx.createBufferSource();
        streamSrc.buffer = this.createOrganicNoiseBuffer(ctx, "pink");
        streamSrc.loop = true;

        const streamBand = ctx.createBiquadFilter();
        streamBand.type = "bandpass";
        streamBand.frequency.value = 620;
        streamBand.Q.value = 0.8;

        const streamLowpass = ctx.createBiquadFilter();
        streamLowpass.type = "lowpass";
        streamLowpass.frequency.value = 1100;

        const streamLfo = ctx.createOscillator();
        streamLfo.type = "sine";
        streamLfo.frequency.value = 0.28; // 水面の穏やかな揺らぎ

        const streamLfoGain = ctx.createGain();
        streamLfoGain.gain.value = 110;

        streamLfo.connect(streamLfoGain);
        streamLfoGain.connect(streamBand.frequency);

        streamSrc.connect(streamBand);
        streamBand.connect(streamLowpass);
        streamLowpass.connect(envGain);

        streamSrc.start();
        streamLfo.start();
        this.activeNodes.push(
          streamSrc,
          streamBand,
          streamLowpass,
          streamLfo,
          streamLfoGain
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
