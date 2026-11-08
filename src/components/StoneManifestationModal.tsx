// クライマックス演出：「覚悟の石（Stone of Resolution）」の顕現アニメーション画面
// spec.md 4.3節・5.4節に準拠:
// ユーザーが結論を出した時、心の中の庭に「覚悟の石」がゲーム感覚のリッチな発光アニメーションと共に立ち上がり、
// ユーザーの結論と円覚寺の法話（quote・出典リンク）が授与される。

import React, { useEffect, useState } from "react";
import { SavedResolutionStone, StoneColorTheme } from "../types/zen";
import { Sparkles, ExternalLink, Check, BookOpen } from "lucide-react";

interface StoneManifestationModalProps {
  stone: SavedResolutionStone;
  onComplete: () => void;
}

const THEME_STYLES: Record<
  StoneColorTheme,
  {
    badge: string;
    glowRing: string;
    gradientFill: string;
    stroke: string;
  }
> = {
  golden_resolve: {
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    glowRing: "shadow-[0_0_85px_25px_rgba(251,191,36,0.45)]",
    gradientFill: "url(#gradGolden)",
    stroke: "#fef08a",
  },
  emerald_glow: {
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    glowRing: "shadow-[0_0_85px_25px_rgba(52,211,153,0.45)]",
    gradientFill: "url(#gradEmerald)",
    stroke: "#a7f3d0",
  },
  sapphire_zen: {
    badge: "bg-sky-500/20 text-sky-200 border-sky-400/40",
    glowRing: "shadow-[0_0_85px_25px_rgba(96,165,250,0.45)]",
    gradientFill: "url(#gradSapphire)",
    stroke: "#bfdbfe",
  },
  lotus_warm: {
    badge: "bg-pink-500/20 text-pink-200 border-pink-400/40",
    glowRing: "shadow-[0_0_85px_25px_rgba(244,114,182,0.45)]",
    gradientFill: "url(#gradLotus)",
    stroke: "#fbcfe8",
  },
};

export const StoneManifestationModal: React.FC<
  StoneManifestationModalProps
> = ({ stone, onComplete }) => {
  const [stage, setStage] = useState<"converging" | "risen">("converging");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setStage("risen");
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const theme =
    THEME_STYLES[stone.visual.color_theme] || THEME_STYLES.golden_resolve;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-300/30 bg-gradient-to-b from-[#111a2e]/95 via-[#0b1120]/95 to-[#070b14]/95 p-6 sm:p-8 text-center shadow-2xl my-auto">
        {/* 1. ピカピカと光りながら立ち上がる「覚悟の石」3D風SVGアニメーション */}
        <div className="relative mx-auto w-44 h-44 flex items-center justify-center mb-4">
          {/* 後光・オーラ */}
          <div
            className={`absolute w-28 h-28 rounded-full transition-all duration-1000 ${
              stage === "risen"
                ? `scale-125 opacity-100 ${theme.glowRing}`
                : "scale-50 opacity-30"
            }`}
          />

          {/* 回転する円相の光の輪 */}
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-200/30 animate-spin [animation-duration:18s]" />
          <div className="absolute inset-6 rounded-full border border-amber-300/25 animate-pulse" />

          {/* 立ち上がる覚悟の石 SVG */}
          <svg
            viewBox="0 0 200 200"
            className={`w-36 h-36 transition-all duration-1000 ease-out transform ${
              stage === "risen"
                ? "translate-y-0 scale-100 opacity-100 animate-float"
                : "translate-y-12 scale-50 opacity-0"
            }`}
          >
            <defs>
              <linearGradient id="gradGolden" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ecfdf5" />
                <stop offset="45%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>
              <linearGradient id="gradSapphire" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#eff6ff" />
                <stop offset="45%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="gradLotus" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff1f2" />
                <stop offset="45%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#831843" />
              </linearGradient>
            </defs>

            {/* 結晶石のポリゴン */}
            <polygon
              points="100,22 148,78 132,165 68,165 52,78"
              fill={theme.gradientFill}
              stroke={theme.stroke}
              strokeWidth="2.5"
            />
            {/* 内部の光の稜線（ファセット） */}
            <polyline
              points="100,22 100,165"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.65"
              strokeWidth="1.5"
            />
            <polyline
              points="52,78 100,105 148,78"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            {/* ピカピカと光るスパークル星 */}
            <g className="animate-pulse">
              <path
                d="M100 6 L103 15 L112 18 L103 21 L100 30 L97 21 L88 18 L97 15 Z"
                fill="#fef08a"
              />
              <circle cx="42" cy="52" r="3" fill="#fef08a" />
              <circle cx="158" cy="58" r="3.5" fill="#fef08a" />
              <circle cx="145" cy="145" r="2.5" fill="#fde68a" />
            </g>
          </svg>
        </div>

        {/* 2. タイトルと到達した智慧 */}
        <div className="space-y-2 mb-5">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-serif ${theme.badge}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>心の庭に「覚悟の石」が顕現しました</span>
          </span>
          <h2 className="font-serif text-2xl font-bold text-amber-100 tracking-wider">
            {stone.stone_title}
          </h2>
          <p className="text-xs text-amber-300/80 font-serif">
            到達した智慧：{stone.wisdom_name}
          </p>
        </div>

        {/* 3. ユーザーが導き出した結論（覚悟の言葉） */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-300/25 p-4 text-left mb-4">
          <div className="text-[11px] text-amber-300 font-serif mb-1">
            ◆ あなたが結んだ覚悟・気づき
          </div>
          <p className="font-serif text-sm text-amber-50 leading-relaxed">
            {stone.user_conclusion}
          </p>
        </div>

        {/* 4. 呼応する円覚寺の法話（knowledge_graph.json の discourses 原典） */}
        <div className="rounded-2xl bg-slate-900/85 border border-white/10 p-4 text-left mb-6">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="inline-flex items-center gap-1 text-sky-300 font-serif">
              <BookOpen className="w-3.5 h-3.5" />
              円覚寺 師家の法話：{stone.master_name} 老師
            </span>
            <span>{stone.source_title}</span>
          </div>
          <blockquote className="font-serif text-xs sm:text-sm text-slate-200 leading-relaxed border-l-2 border-amber-400/50 pl-3 my-2">
            「{stone.quote}」
          </blockquote>
          {stone.source_url && (
            <div className="text-right mt-2">
              <a
                href={stone.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 underline underline-offset-2"
              >
                <span>円覚寺公式法話ページを開く</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* 5. 心の庭へ石を据えるボタン */}
        <button
          onClick={onComplete}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-serif font-bold tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition"
        >
          <Check className="w-4 h-4" />
          <span>心の庭にこの「覚悟の石」を据える</span>
        </button>
      </div>
    </div>
  );
};
