// 光と陰影の「心の庭（箱庭）」2.5D インタラクティブ・キャンバスレンダラー
// spec.md 第4章・第7章に準拠:
// - 落ち着いたライト（光）の配色（深藍・墨色・琥珀・月白・瑠璃・桜）
// - 枯山水の砂紋、静かな水面の揺らぎ、ホタルのような微細な光の粒子
// - 庭に永続配置され、ピカピカと神秘的に輝く「覚悟の石（Stone of Resolution）」の描画とタップ検出

import React, { useEffect, useRef } from "react";
import {
  LightMood,
  SavedResolutionStone,
  SoundType,
  StoneColorTheme,
  StoneShapeType,
} from "../types/zen";

interface ZenGardenCanvasProps {
  lightMood: LightMood;
  stones: SavedResolutionStone[];
  selectedStoneId?: string | null;
  onSelectStone: (stone: SavedResolutionStone) => void;
  ambientSound: SoundType;
  rippleTrigger: number;
  isMeditationMode: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  hue: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const MOOD_PALETTES: Record<
  LightMood,
  {
    skyTop: string;
    skyMid: string;
    groundBottom: string;
    glowPrimary: string;
    glowSecondary: string;
    particleColor: string;
  }
> = {
  amber_calm: {
    skyTop: "#050811",
    skyMid: "#10192b",
    groundBottom: "#090d16",
    glowPrimary: "rgba(245, 158, 11, 0.24)",
    glowSecondary: "rgba(251, 191, 36, 0.14)",
    particleColor: "253, 230, 138",
  },
  moon_accept: {
    skyTop: "#040914",
    skyMid: "#0f2238",
    groundBottom: "#07111e",
    glowPrimary: "rgba(56, 189, 248, 0.20)",
    glowSecondary: "rgba(167, 243, 208, 0.14)",
    particleColor: "186, 230, 253",
  },
  ocean_deep: {
    skyTop: "#020617",
    skyMid: "#0c1e3e",
    groundBottom: "#061024",
    glowPrimary: "rgba(59, 130, 246, 0.25)",
    glowSecondary: "rgba(147, 197, 253, 0.15)",
    particleColor: "191, 219, 254",
  },
  gold_resolute: {
    skyTop: "#09080f",
    skyMid: "#1f1924",
    groundBottom: "#120e14",
    glowPrimary: "rgba(251, 191, 36, 0.30)",
    glowSecondary: "rgba(245, 158, 11, 0.18)",
    particleColor: "254, 240, 138",
  },
  sakura_compassion: {
    skyTop: "#090712",
    skyMid: "#1f162b",
    groundBottom: "#0e0a16",
    glowPrimary: "rgba(244, 114, 182, 0.22)",
    glowSecondary: "rgba(253, 186, 116, 0.14)",
    particleColor: "251, 207, 232",
  },
};

const STONE_COLORS: Record<
  StoneColorTheme,
  { core: string; mid: string; edge: string; halo: string; sparkle: string }
> = {
  emerald_glow: {
    core: "#ecfdf5",
    mid: "#34d399",
    edge: "#065f46",
    halo: "52, 211, 153",
    sparkle: "#a7f3d0",
  },
  sapphire_zen: {
    core: "#eff6ff",
    mid: "#60a5fa",
    edge: "#1e3a8a",
    halo: "96, 165, 250",
    sparkle: "#bfdbfe",
  },
  golden_resolve: {
    core: "#fefce8",
    mid: "#fbbf24",
    edge: "#92400e",
    halo: "251, 191, 36",
    sparkle: "#fef08a",
  },
  lotus_warm: {
    core: "#fff1f2",
    mid: "#f472b6",
    edge: "#831843",
    halo: "244, 114, 182",
    sparkle: "#fbcfe8",
  },
};

export const ZenGardenCanvas: React.FC<ZenGardenCanvasProps> = ({
  lightMood,
  stones,
  selectedStoneId,
  onSelectStone,
  ambientSound,
  rippleTrigger,
  isMeditationMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // 対話やイベント連動で中央に光の波紋を広げる
  useEffect(() => {
    if (rippleTrigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const palette = MOOD_PALETTES[lightMood] || MOOD_PALETTES.amber_calm;
    ripplesRef.current.push({
      x: canvas.width * 0.5,
      y: canvas.height * 0.54,
      radius: 8,
      maxRadius: Math.min(canvas.width, canvas.height) * 0.45,
      alpha: 0.65,
      color: palette.particleColor,
    });
  }, [rippleTrigger, lightMood]);

  // キャンバス描画ループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // 初期の光の粒子（ホタル・露のきらめき）を生成
    if (particlesRef.current.length === 0) {
      const count = 42;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -0.12 - Math.random() * 0.25,
          radius: 1.2 + Math.random() * 2.4,
          alpha: 0.2 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          hue: "253, 230, 138",
        });
      }
    }

    const drawStoneShape = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      shape: StoneShapeType
    ) => {
      c.beginPath();
      if (shape === "crystal_zen") {
        c.moveTo(x, y - size * 1.25);
        c.lineTo(x + size * 0.85, y - size * 0.2);
        c.lineTo(x + size * 0.6, y + size * 0.85);
        c.lineTo(x - size * 0.6, y + size * 0.85);
        c.lineTo(x - size * 0.85, y - size * 0.2);
      } else if (shape === "standing_monolith") {
        c.moveTo(x - size * 0.2, y - size * 1.35);
        c.lineTo(x + size * 0.45, y - size * 1.1);
        c.lineTo(x + size * 0.7, y + size * 0.85);
        c.lineTo(x - size * 0.7, y + size * 0.85);
        c.lineTo(x - size * 0.6, y - size * 0.7);
      } else if (shape === "moss_jewel") {
        c.moveTo(x, y - size * 0.95);
        c.quadraticCurveTo(x + size * 1.05, y - size * 0.6, x + size * 0.9, y + size * 0.5);
        c.quadraticCurveTo(x, y + size * 1.0, x - size * 0.9, y + size * 0.5);
        c.quadraticCurveTo(x - size * 1.05, y - size * 0.6, x, y - size * 0.95);
      } else {
        // round_pebble
        c.ellipse(x, y, size * 0.95, size * 0.72, 0, 0, Math.PI * 2);
      }
      c.closePath();
    };

    const render = () => {
      time += 0.016;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const palette = MOOD_PALETTES[lightMood] || MOOD_PALETTES.amber_calm;

      // 1. 背景グラデーション（夜空〜心の庭の大地）
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, palette.skyTop);
      bgGrad.addColorStop(0.52, palette.skyMid);
      bgGrad.addColorStop(1, palette.groundBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. 呼吸する中心のアンビエントライト（月輪・円相の柔光）
      const breath = Math.sin(time * 0.85) * 0.5 + 0.5;
      const centerGlowRadius = Math.min(w, h) * (0.42 + breath * 0.07);
      const centerX = w * 0.5;
      const centerY = h * 0.44;

      const ambientGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        centerGlowRadius
      );
      ambientGlow.addColorStop(0, palette.glowPrimary);
      ambientGlow.addColorStop(0.55, palette.glowSecondary);
      ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, w, h);

      // 3. 遠景の禅山シルエット（水墨画風の2.5Dレイヤー）
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      for (let x = 0; x <= w; x += 24) {
        const y =
          h * 0.5 +
          Math.sin(x * 0.0045 + 1.2) * 28 +
          Math.cos(x * 0.011) * 14;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const hillGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
      hillGrad.addColorStop(0, "rgba(10, 17, 30, 0.72)");
      hillGrad.addColorStop(1, "rgba(5, 9, 17, 0.96)");
      ctx.fillStyle = hillGrad;
      ctx.fill();
      ctx.restore();

      // 4. 枯山水・水面の同心円砂紋（波紋）— 庭の中央ステージ（h * 0.48）を中心に広げる
      ctx.save();
      const gardenCenterY = h * 0.48;
      for (let i = 1; i <= 7; i++) {
        const rx = Math.min(w * 0.46, 48 * i + Math.sin(time * 0.6 + i) * 3);
        const ry = rx * 0.38;
        ctx.beginPath();
        ctx.ellipse(centerX, gardenCenterY, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${palette.particleColor}, ${0.068 - i * 0.006})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();

      // 5. 自然環境音（雨・波・小川）に応じた視覚演出
      if (ambientSound === "rain" && Math.random() > 0.55) {
        ripplesRef.current.push({
          x: w * (0.15 + Math.random() * 0.7),
          y: h * (0.42 + Math.random() * 0.4),
          radius: 2,
          maxRadius: 32 + Math.random() * 35,
          alpha: 0.45,
          color: "186, 230, 253",
        });
      }

      // 6. インタラクティブ波紋（Ripples）の描画
      ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0.01);
      ripplesRef.current.forEach((r) => {
        r.radius += 1.25;
        r.alpha *= 0.978;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.46, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });

      // 7. 庭に立ち上がった「覚悟の石（Stones of Resolution）」の描画
      // Y座標順にソートして奥行き（前後関係）を表現
      const sortedStones = [...stones].sort(
        (a, b) => a.visual.position.y - b.visual.position.y
      );

      sortedStones.forEach((stone, idx) => {
        const sx = stone.visual.position.x * w;
        const sy = stone.visual.position.y * h;
        const colorSpec =
          STONE_COLORS[stone.visual.color_theme] || STONE_COLORS.golden_resolve;
        const isSelected = stone.id === selectedStoneId;
        const pulse = Math.sin(time * 2.2 + idx * 1.4) * 0.5 + 0.5;
        const baseSize = isSelected ? 24 : 19;

        // 石の足元の水面・苔への光の映り込み（楕円リング）
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          sx,
          sy + baseSize * 0.72,
          baseSize * (1.45 + pulse * 0.35),
          baseSize * (0.55 + pulse * 0.15),
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = `rgba(${colorSpec.halo}, ${0.32 + pulse * 0.25})`;
        ctx.lineWidth = isSelected ? 2 : 1.2;
        ctx.stroke();

        // ピカピカと輝く後光（ブルーム・ハロ効果）
        const haloRadius = baseSize * (2.6 + pulse * 0.9);
        const haloGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, haloRadius);
        haloGrad.addColorStop(0, `rgba(${colorSpec.halo}, ${0.65 + pulse * 0.25})`);
        haloGrad.addColorStop(0.45, `rgba(${colorSpec.halo}, ${0.24 + pulse * 0.12})`);
        haloGrad.addColorStop(1, `rgba(${colorSpec.halo}, 0)`);
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // 石本体の立体グラデーション描画
        drawStoneShape(ctx, sx, sy, baseSize, stone.visual.shape_type);
        const stoneGrad = ctx.createLinearGradient(
          sx - baseSize,
          sy - baseSize,
          sx + baseSize,
          sy + baseSize
        );
        stoneGrad.addColorStop(0, colorSpec.core);
        stoneGrad.addColorStop(0.48, colorSpec.mid);
        stoneGrad.addColorStop(1, colorSpec.edge);
        ctx.fillStyle = stoneGrad;
        ctx.shadowColor = `rgba(${colorSpec.halo}, 0.85)`;
        ctx.shadowBlur = isSelected ? 26 : 16;
        ctx.fill();

        ctx.strokeStyle = colorSpec.core;
        ctx.lineWidth = isSelected ? 2.2 : 1.2;
        ctx.stroke();

        // 結晶のファセット（光の稜線）
        ctx.beginPath();
        ctx.moveTo(sx, sy - baseSize * 0.9);
        ctx.lineTo(sx - baseSize * 0.2, sy + baseSize * 0.65);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 石の周囲にきらめく十字スパークル（ピカピカ感）
        const sparkleAlpha = Math.max(0, Math.sin(time * 3.6 + idx * 2.1));
        if (sparkleAlpha > 0.15) {
          const spX = sx + Math.cos(idx * 1.7 + time * 0.5) * (baseSize * 0.7);
          const spY = sy - baseSize * 0.65 + Math.sin(time * 1.2) * 4;
          const spLen = (5 + pulse * 5) * sparkleAlpha;

          ctx.strokeStyle = colorSpec.sparkle;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(spX - spLen, spY);
          ctx.lineTo(spX + spLen, spY);
          ctx.moveTo(spX, spY - spLen);
          ctx.lineTo(spX, spY + spLen);
          ctx.stroke();
        }

        // 石のタイトルラベル（庭モード時：半透明の黒背景ピルを敷いて視認性と美しさを高める）
        if (!isMeditationMode) {
          ctx.font = '500 11px "Shippori Mincho", serif';
          ctx.textAlign = "center";
          const shortTitle =
            stone.stone_title.length > 13
              ? stone.stone_title.slice(0, 13) + "…"
              : stone.stone_title;
          const labelY = sy + baseSize * 1.52;
          const textMetrics = ctx.measureText(shortTitle);
          const padX = 8;
          const pillW = textMetrics.width + padX * 2;
          const pillH = 18;

          ctx.fillStyle = "rgba(7, 11, 20, 0.72)";
          ctx.beginPath();
          ctx.roundRect(
            sx - pillW / 2,
            labelY - 13,
            pillW,
            pillH,
            9
          );
          ctx.fill();

          ctx.strokeStyle = isSelected
            ? "rgba(251, 191, 36, 0.55)"
            : "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.fillStyle = isSelected
            ? "rgba(254, 243, 199, 0.98)"
            : "rgba(241, 245, 249, 0.9)";
          ctx.fillText(shortTitle, sx, labelY);
        }

        ctx.restore();
      });

      // 8. 空間を漂う微細な光の粒子（ホタル・露の光）
      particlesRef.current.forEach((p) => {
        p.x += p.vx + Math.sin(time * 0.7 + p.phase) * 0.15;
        p.y += p.vy;
        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const twinkle = (Math.sin(time * 2.1 + p.phase) * 0.5 + 0.5) * p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${palette.particleColor}, ${twinkle})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [lightMood, stones, selectedStoneId, ambientSound, isMeditationMode]);

  // キャンバス上の「覚悟の石」タップまたは水面タップ判定
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // タップ位置に波紋を追加
    const palette = MOOD_PALETTES[lightMood] || MOOD_PALETTES.amber_calm;
    ripplesRef.current.push({
      x: clickX,
      y: clickY,
      radius: 4,
      maxRadius: 65,
      alpha: 0.55,
      color: palette.particleColor,
    });

    // 覚悟の石の当たり判定
    for (let i = stones.length - 1; i >= 0; i--) {
      const st = stones[i];
      const sx = st.visual.position.x * w;
      const sy = st.visual.position.y * h;
      const dist = Math.hypot(clickX - sx, clickY - sy);
      if (dist <= 36) {
        onSelectStone(st);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="fixed inset-0 w-full h-full cursor-pointer touch-manipulation z-0"
    />
  );
};
